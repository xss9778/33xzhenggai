import localforage from 'localforage';
import { Project, RectificationRecord } from '../types';

const RECORDS_KEY = 'rectification_records';
const PROJECTS_KEY = 'rectification_projects';

// Initialize localforage
localforage.config({
  name: 'RectificationApp',
  storeName: 'app_data'
});

export const storage = {
  async getRecords(): Promise<RectificationRecord[]> {
    return (await localforage.getItem<RectificationRecord[]>(RECORDS_KEY)) || [];
  },

  async saveRecord(record: RectificationRecord) {
    const records = await this.getRecords();
    const index = records.findIndex(r => r.id === record.id);
    if (index >= 0) {
      records[index] = record;
    } else {
      records.unshift(record);
    }
    await localforage.setItem(RECORDS_KEY, records);
  },

  async deleteRecord(id: string) {
    const records = await this.getRecords();
    const filtered = records.filter(r => r.id !== id);
    await localforage.setItem(RECORDS_KEY, filtered);
  },

  async getProjects(): Promise<Project[]> {
    const projects = await localforage.getItem<Project[]>(PROJECTS_KEY);
    if (!projects || projects.length === 0) {
      const defaultProject = { id: 'default', name: '默认项目', createdAt: new Date().toISOString() };
      await localforage.setItem(PROJECTS_KEY, [defaultProject]);
      return [defaultProject];
    }
    return projects;
  },

  async saveProject(project: Project) {
    const projects = await this.getProjects();
    projects.push(project);
    await localforage.setItem(PROJECTS_KEY, projects);
  }
};
