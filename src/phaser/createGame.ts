import * as Phaser from 'phaser';
import type { HospitalSimulation } from '../game/simulation/hospitalSimulation';
import { HospitalScene } from './scenes/HospitalScene';

export function createGame(parent: string, simulation: HospitalSimulation): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 864,
    height: 576,
    backgroundColor: '#dff8f0',
    pixelArt: false,
    antialias: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [new HospitalScene(simulation)],
  });
}
