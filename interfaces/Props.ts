import { VRM } from "@pixiv/three-vrm";
import { Viseme } from "./Viseme";

export interface AvatarProps {
  avatar: any;
  lipSyncData?: Viseme[];
  isPlaying?: boolean;
}
