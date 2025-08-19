"use client";
import { Loader, Stats } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { Experience } from "@/components/Experience";
import Message from "@/interfaces/Message";
import ChatPanel from "@/components/ChatPanel";
import { AVATAR_LIST, BACKEND_URL, GOOGLE_VOICE_LIST } from "@/constants";
import Conversation from "@/interfaces/Conversation";
import Avatar from "@/components/Avatar";
import { useControls } from "leva";
import Image from "next/image";
import Link from "next/link";

export default function TestPage() {
  const [isPlaying] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // App component giờ là nguồn dữ liệu duy nhất cho lịch sử chat
  const [chatHistory, setChatHistory] = useState<Message[]>([]);

  const { avatar, voice } = useControls("VRM", {
    avatar: {
      value: AVATAR_LIST[0],
      options: AVATAR_LIST,
    },
    voice: {
      value: "Zephyr",
      options: GOOGLE_VOICE_LIST?.map((voice) => voice.voice_name),
    },
  });

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/conversations?limit=10`);
        const data = await response.json();
        // Backend trả về mới nhất trước, ta cần đảo ngược lại để hiển thị đúng thứ tự
        const formattedHistory: Message[] = data
          .map((item: Conversation) => ({
            id: item?.id || crypto.randomUUID(),
            role: item.role,
            parts: [{ text: item.content }],
          }))
          .reverse();
        setChatHistory(formattedHistory);
      } catch (error) {
        console.error("Lỗi khi tải lịch sử chat:", error);
      }
    };
    fetchHistory();
  }, []);

  // ### <<< THAY ĐỔI MỚI: KẾT NỐI VỚI BACKEND /chat >>> ###
  const handleNewMessageFromChat = async (userInput: string) => {
    setIsThinking(true);
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      parts: [{ text: userInput }],
    };
    // Cập nhật UI ngay lập tức với tin nhắn của người dùng
    setChatHistory((prev) => [...prev, userMessage]);

    try {
      const payload = {
        message: userInput,
        voice_name: voice,
      };

      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }

      const result = await response.json();
      const { reply_text, audio_url } = result;

      const aiMessage: Message = {
        id: crypto.randomUUID(),
        role: "model",
        parts: [{ text: reply_text }],
      };
      setChatHistory((prev) => [...prev, aiMessage]);
      setAudioUrl(audio_url);
    } catch (error) {
      console.error("Lỗi khi gọi API chat:", error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "model",
        parts: [
          { text: "Xin lỗi, tôi gặp sự cố khi kết nối. Vui lòng thử lại." },
        ],
      };
      setChatHistory((prev) => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <>
      <div className="fixed top-0 w-full justify-center h-auto flex mx-auto z-100">
        <Link className="translate-y-6" href="/">
          <Image
            className="invert"
            src="/images/logo_vroid.svg"
            alt="Vroid logo"
            width={180}
            height={40}
          />
        </Link>
      </div>
      <div className="fixed top-0 left-0 w-[450px] h-full p-4 pt-20 z-10">
        <ChatPanel
          messages={chatHistory}
          onNewMessage={handleNewMessageFromChat}
          isThinking={isThinking}
        />
      </div>
      <Loader />
      <Canvas
        className="w-full h-full"
        shadows
        style={{
          width: "100vw",
          height: "100vh",
        }}
        camera={{ position: [0.25, 0.25, 2], fov: 30 }}
      >
        <color attach="background" args={["#333"]} />
        <fog attach="fog" args={["#333", 10, 20]} />
        <Stats className="fixed bottom-0 right-0 flex justify-end items-end pointer-events-none user-select-none" />
        <Suspense>
          <Experience>
            <Avatar
              avatar={`${avatar}.vrm`}
              isPlaying={isPlaying}
              isThinking={isThinking}
              audioUrl={audioUrl}
              setAudioUrl={setAudioUrl}
            />
          </Experience>
        </Suspense>
      </Canvas>
    </>
  );
}
