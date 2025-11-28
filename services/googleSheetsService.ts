import { DailyReport, Transaction, Jar } from '../types';
import { MOCK_JARS, MOCK_HISTORY_DATA } from '../constants';

// This service mimics the interaction with Google App Script.
// In a real app, these methods would fetch() to your GAS Web App URL.

const MOCK_DELAY = 600;

export const getJars = async (): Promise<Jar[]> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve([...MOCK_JARS]), MOCK_DELAY);
  });
};

export const updateJarBalance = async (jarId: string, newBalance: number): Promise<boolean> => {
  // Call to backend to update Sheet
  console.log(`Updating jar ${jarId} to ${newBalance}`);
  return new Promise((resolve) => setTimeout(() => resolve(true), MOCK_DELAY));
};

export const getDashboardData = async () => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_HISTORY_DATA), MOCK_DELAY);
  });
};

export const saveDailyReport = async (report: DailyReport): Promise<boolean> => {
  console.log("Saving Report to Sheets:", report);
  // This is where you'd structure your payload for do Post(e) in GAS
  return new Promise((resolve) => setTimeout(() => resolve(true), MOCK_DELAY));
};
