export interface User {
  id: string;
  email: string;
}

export interface Project {
  id: number;
  user_id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface Note {
  id: number;
  project_id: number;
  title: string;
  content: string;
  date: string;
  created_at: string;
  project_name?: string;
}

export interface ChecklistItem {
  id: number;
  checklist_id: number;
  text: string;
  completed: number;
}

export interface Checklist {
  id: number;
  project_id: number;
  title: string;
  created_at: string;
  items: ChecklistItem[];
  project_name?: string;
}
