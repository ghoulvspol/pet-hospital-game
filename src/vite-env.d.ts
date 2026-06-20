/// <reference types="vite/client" />

declare module '*.css';

declare global {
  interface Window {
    petHospitalTest?: {
      simulation: import('./game/simulation/hospitalSimulation').HospitalSimulation;
    };
  }
}

export {};
