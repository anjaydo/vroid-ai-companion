export default interface Message {
  id: string;
  role: "user" | "model";
  parts: { text: string }[];
}
