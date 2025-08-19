export default interface Conversation {
  id: number | string | null;
  created_at: string;
  user_id: string | null;
  role: string;
  content: string;
}
