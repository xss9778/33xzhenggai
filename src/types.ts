export type RectificationStatus = 'completed' | 'needs_improvement' | 'rectified';

export interface Marker {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  status: RectificationStatus;
  label?: string;
}

export interface RectificationRecord {
  id: string;
  projectId: string;
  projectName: string;
  date: string; // creation date
  rectificationDate: string; // user-specified date
  beforeImage: string; // base64 or URL
  afterImage: string;  // base64 or URL
  markers: Marker[];
  description?: string;
  note?: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
}
