import Google from "@/components/logo/Google";
import { BACKEND_URL } from "@/constants";
import Image from "next/image";
import Link from "next/link";
import { FaBookTanakh } from "react-icons/fa6";

export default function Home() {
  return (
    <div
      style={{
        backgroundImage: "url('/images/bg.webp')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20"
    >
      <main className="flex flex-col gap-[32px] row-start-2 items-center justify-center text-black w-full h-full z-100">
        <Image
          className="h-[90px] w-auto -translate-x-3.5"
          src="/images/logo_vroid.svg"
          alt="Vroid logo"
          width={180}
          height={40}
          priority
        />
        <h1 className="text-6xl font-bold text-black -mt-6">
          <span className="sr-only">VROID</span>
          <span>AI</span> <span>COMPANION</span>
        </h1>
        <h2 className="text-2xl text-black/80 text-center mx-auto max-w-[800px]">
          Vroid avatar, chats with a Gemini-based backend, and performs
          audio-driven lip sync with blendshapes and Mixamo-retargeted
          animations.
        </h2>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            href={BACKEND_URL + "/docs"}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaBookTanakh />
            View Docs
          </a>
          <Link
            className="rounded-full bg-black text-gray-200 border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:text-white hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-[158px]"
            href="/chat"
          >
            Preview
          </Link>
        </div>
      </main>
      <div className="fixed bottom-0 left-0 w-full h-full bg-gradient-to-b from-white to-transparent z-10"></div>
      <div className="fixed bottom-0 left-0 w-full h-[400px] bg-gradient-to-t from-40% from-white to-100% to-transparent z-10"></div>
      <footer className="fixed bottom-0 left-0 pb-12 w-full flex gap-[60px] flex-wrap items-center justify-center z-20">
        <Link
          className="h-max w-auto flex items-center justify-center"
          target="_blank"
          rel="noopener noreferrer"
          href="https://nextjs.org/"
        >
          <Image
            className=""
            src="/next.svg"
            alt="Next.js logo"
            width={180}
            height={40}
            priority
          />
        </Link>
        <Link
          className="h-max w-auto flex items-center justify-center"
          target="_blank"
          rel="noopener noreferrer"
          href="https://supabase.com/"
        >
          <Image
            className="
            h-[50px] w-auto"
            src="/images/supabase-logo-wordmark--light.svg"
            alt="Supabase logo"
            width={180}
            height={40}
            priority
          />
        </Link>
        <Link
          className="h-max w-auto flex items-center justify-center"
          target="_blank"
          rel="noopener noreferrer"
          href="https://www.google.com"
        >
          <Google className="w-[323px] aspect-[323/49] text-white fill-black" />
        </Link>
        <Link
          className="h-max w-auto flex items-center justify-center"
          target="_blank"
          rel="noopener noreferrer"
          href="https://vroid.com/en"
        >
          <Image
            className="
            h-[50px] w-auto"
            src="/images/logo_vroid.svg"
            alt="Vroid logo"
            width={180}
            height={40}
            priority
          />
        </Link>
      </footer>
    </div>
  );
}
