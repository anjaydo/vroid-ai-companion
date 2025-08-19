"use client";
import { Loader, Stats } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import { Experience } from "@/components/Experience";
import useLipSync from "@/hooks/useLipSync";
import Message from "@/interfaces/Message";
import ChatPanel from "@/components/ChatPanel";
import { BACKEND_URL, LOCAL_URL } from "@/constants";
import { VRM } from "@pixiv/three-vrm";
import Conversation from "@/interfaces/Conversation";
import Avatar from "@/components/Avatar";
import { useControls } from "leva";

export default function TestPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // App component giờ là nguồn dữ liệu duy nhất cho lịch sử chat
  const [chatHistory, setChatHistory] = useState<Message[]>([]);

  const { avatar } = useControls("VRM", {
    avatar: {
      value: "262410318834873893.vrm",
      options: [
        "VRM1_Constraint_Twist.vrm",
        "8087383217573817818.vrm",
        "262410318834873893.vrm",
        "3859814441197244330.vrm",
        "3636451243928341470.vrm",
      ],
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
        // voice_name: "en-US-Wavenet-F", // Có thể chọn giọng khác
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
      <div className="fixed top-0 left-0 w-[450px] h-full p-4 z-10">
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
        <Stats />
        <Suspense>
          <Experience>
            <Avatar
              avatar={avatar}
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
