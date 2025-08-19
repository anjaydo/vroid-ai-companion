import os
import uuid
from typing import Optional, List

from fastapi import FastAPI, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv
from gtts import gTTS

import base64
import mimetypes
import re
import struct
from google import genai
from google.genai import types

# --- 1. Tải các biến môi trường ---
load_dotenv()

# --- 2. Khởi tạo các client ---
# Supabase
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

# Google AI
google_api_key = os.environ.get("GOOGLE_AI_API_KEY")
client = genai.Client(
    api_key=google_api_key,
)
# --- 3. Khởi tạo FastAPI App ---
app = FastAPI()

origins = [
    "http://localhost:3000",  # Địa chỉ mặc định của Next.js dev server
    "http://localhost:3001",  # Có thể là một port khác
    # Bạn có thể thêm địa chỉ web đã deploy của bạn vào đây sau này
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Cho phép tất cả các method (GET, POST, etc.)
    allow_headers=["*"],  # Cho phép tất cả các header
)

# Tạo thư mục static nếu chưa tồn tại
os.makedirs("static/audio", exist_ok=True)

# Mount thư mục static để truy cập file công khai
app.mount("/static", StaticFiles(directory="static"), name="static")


# --- 4. Định nghĩa các Pydantic Model (để validate request/response) ---
class ChatRequest(BaseModel):
    user_id: Optional[str] = None
    message: str
    voice_name: Optional[str] = "Zephyr"


class ChatResponse(BaseModel):
    reply_text: str
    audio_url: str


class ConversationMessage(BaseModel):
    role: str
    content: str


class Conversation(BaseModel):
    id: int
    created_at: str
    user_id: Optional[str]
    role: str
    content: str


def save_binary_file(file_name, data):
    filepath = os.path.join("static/audio", file_name)
    with open(filepath, "wb") as f:
        f.write(data)
        f.close()
    print(f"File saved to to: {filepath}")
    return filepath


def convert_to_wav(audio_data: bytes, mime_type: str) -> bytes:
    """Generates a WAV file header for the given audio data and parameters.

    Args:
        audio_data: The raw audio data as a bytes object.
        mime_type: Mime type of the audio data.

    Returns:
        A bytes object representing the WAV file header.
    """
    parameters = parse_audio_mime_type(mime_type)
    bits_per_sample = parameters["bits_per_sample"]
    sample_rate = parameters["rate"]
    num_channels = 1
    data_size = len(audio_data)
    bytes_per_sample = bits_per_sample // 8
    block_align = num_channels * bytes_per_sample
    byte_rate = sample_rate * block_align
    chunk_size = 36 + data_size  # 36 bytes for header fields before data chunk size

    # http://soundfile.sapp.org/doc/WaveFormat/

    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",  # ChunkID
        chunk_size,  # ChunkSize (total file size - 8 bytes)
        b"WAVE",  # Format
        b"fmt ",  # Subchunk1ID
        16,  # Subchunk1Size (16 for PCM)
        1,  # AudioFormat (1 for PCM)
        num_channels,  # NumChannels
        sample_rate,  # SampleRate
        byte_rate,  # ByteRate
        block_align,  # BlockAlign
        bits_per_sample,  # BitsPerSample
        b"data",  # Subchunk2ID
        data_size,  # Subchunk2Size (size of audio data)
    )
    return header + audio_data


def parse_audio_mime_type(mime_type: str) -> dict[str, int | None]:
    """Parses bits per sample and rate from an audio MIME type string.

    Assumes bits per sample is encoded like "L16" and rate as "rate=xxxxx".

    Args:
        mime_type: The audio MIME type string (e.g., "audio/L16;rate=24000").

    Returns:
        A dictionary with "bits_per_sample" and "rate" keys. Values will be
        integers if found, otherwise None.
    """
    bits_per_sample = 16
    rate = 24000

    # Extract rate from parameters
    parts = mime_type.split(";")
    for param in parts:  # Skip the main type part
        param = param.strip()
        if param.lower().startswith("rate="):
            try:
                rate_str = param.split("=", 1)[1]
                rate = int(rate_str)
            except (ValueError, IndexError):
                # Handle cases like "rate=" with no value or non-integer value
                pass  # Keep rate as default
        elif param.startswith("audio/L"):
            try:
                bits_per_sample = int(param.split("L", 1)[1])
            except (ValueError, IndexError):
                pass  # Keep bits_per_sample as default if conversion fails

    return {"bits_per_sample": bits_per_sample, "rate": rate}


def generate_audio(text, voice_name="Zephyr", file_name="audio"):
    model = "gemini-2.5-pro-preview-tts"
    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text=text),
            ],
        ),
    ]
    generate_content_config = types.GenerateContentConfig(
        temperature=1,
        response_modalities=[
            "audio",
        ],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice_name)
            )
        ),
    )

    file_index = 0
    for chunk in client.models.generate_content_stream(
        model=model,
        contents=contents,
        config=generate_content_config,
    ):
        if (
            chunk.candidates is None
            or chunk.candidates[0].content is None
            or chunk.candidates[0].content.parts is None
        ):
            continue
        if (
            chunk.candidates[0].content.parts[0].inline_data
            and chunk.candidates[0].content.parts[0].inline_data.data
        ):
            file_index += 1
            inline_data = chunk.candidates[0].content.parts[0].inline_data
            data_buffer = inline_data.data
            file_extension = mimetypes.guess_extension(inline_data.mime_type)
            if file_extension is None:
                file_extension = ".wav"
                data_buffer = convert_to_wav(inline_data.data, inline_data.mime_type)
            save_binary_file(f"{file_name}{file_extension}", data_buffer)
            print(f"Saved file: {file_name}{file_extension}")
            return f"{file_name}{file_extension}"
        else:
            print(chunk.text)


def generate_text(user_message, db_history):
    # Định dạng lại lịch sử cho Gemini API
    gemini_history = [
        types.Content(
            role=msg["role"],
            parts=[
                types.Part.from_text(text=msg["content"]),
            ],
        )
        for msg in db_history
    ]

    model = "gemini-2.5-flash-lite"
    tools = [
        types.Tool(url_context=types.UrlContext()),
    ]
    generate_content_config = types.GenerateContentConfig(
        top_p=0.9,
        max_output_tokens=200,
        thinking_config=types.ThinkingConfig(
            thinking_budget=512,
        ),
        tools=tools,
        system_instruction=[
            types.Part.from_text(
                text="""Response must be in markdown format so the client can format it in render, the length of the response must be less than 200 words, the response should not be a list of items"""
            ),
        ],
    )

    # === BƯỚC B: GỌI GOOGLE AI API ===
    chat_session = client.chats.create(
        model=model, config=generate_content_config, history=gemini_history
    )
    response = chat_session.send_message(user_message)
    if response.text is None:
        print(f"Response: {response}")
    return response.text


### <<< ENDPOINT MỚI: GET /conversations >>> ###
@app.get("/conversations", response_model=List[Conversation])
async def get_conversations(
    user_id: Optional[str] = None,
    # Sử dụng Query để có thêm validation và metadata cho params
    limit: int = Query(default=20, ge=1, le=100),  # Giới hạn từ 1 đến 100
    offset: int = Query(default=0, ge=0),
):
    """
    Lấy lịch sử hội thoại với tính năng phân trang.
    Sắp xếp theo tin nhắn mới nhất trước tiên.
    """
    query = supabase.table("conversations").select("*")

    if user_id:
        query = query.eq("user_id", user_id)

    # Sắp xếp theo 'created_at' giảm dần (mới nhất trước)
    # và áp dụng phân trang
    response = (
        query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    )

    return response.data


# --- 5. Định nghĩa API Endpoint ---
@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, http_request: Request):
    user_id = request.user_id
    user_message = request.message
    # Print message from user_id
    print(f"User ID: {user_id}")
    print(f"User Message: {user_message}")

    # === BƯỚC A: ĐỌC LỊCH SỬ HỘI THOẠI TỪ SUPABASE ===
    query = supabase.table("conversations").select("role, content").order("created_at")
    if user_id:
        query = query.eq("user_id", user_id)
    else:
        # Nếu không có user_id, chúng ta có thể xử lý cho guest user
        # Ví dụ: query = query.is_("user_id", None)
        # Hiện tại, để đơn giản, ta sẽ lấy toàn bộ hội thoại (không tối ưu)
        # Trong thực tế, bạn sẽ cần session id cho guest.
        pass

    db_history = query.execute().data
    ai_reply_text = generate_text(user_message, db_history)
    print(f"AI Reply Text: {ai_reply_text}")

    if ai_reply_text is None:
        return {"reply_text": "AI không trả lời được do lỗi hệ thống", "audio_url": ""}

    # === BƯỚC C & D & E: TẠO FILE AUDIO VÀ LƯU LẠI ===
    try:
        # Cấu hình giọng nói từ request
        # Lưu file audio
        filename = generate_audio(
            text=ai_reply_text,
            voice_name=request.voice_name,
            file_name=f"{uuid.uuid4()}",
        )

    except Exception as e:
        print(f"Lỗi khi tạo file audio với Google AI TTS: {e}")
        return {"reply_text": "Lỗi tạo audio", "audio_url": ""}

    # === BƯỚC C (tiếp): LƯU TIN NHẮN MỚI VÀO SUPABASE ===
    # Lưu tin nhắn của người dùng
    supabase.table("conversations").insert(
        {"user_id": user_id, "role": "user", "content": user_message}
    ).execute()

    # Lưu tin nhắn của AI
    supabase.table("conversations").insert(
        {"user_id": user_id, "role": "model", "content": ai_reply_text}
    ).execute()

    # === BƯỚC F: TRẢ VỀ CLIENT ===
    # Lấy base URL từ request để tạo URL công khai hoàn chỉnh
    base_url = str(http_request.base_url)
    audio_public_url = f"{base_url}static/audio/{filename}"

    return ChatResponse(reply_text=ai_reply_text, audio_url=audio_public_url)


# --- Endpoint gốc để kiểm tra server có chạy không ---
@app.get("/")
def read_root():
    return {"message": "AI Companion Backend is running!"}
