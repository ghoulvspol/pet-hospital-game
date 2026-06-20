import * as Phaser from 'phaser';
import type { PetKind, RoomKind, StaffRole } from '../../game/simulation/types';

const SCALE = 3;

export function registerPixelArt(scene: Phaser.Scene): void {
  createFloorTextures(scene);
  createPetTextures(scene);
  createStaffTextures(scene);
  createRoomTextures(scene);
  createFxTextures(scene);
}

export function petTextureKey(kind: PetKind, frame: 0 | 1): string {
  return `pet-${kind}-${frame}`;
}

export function staffTextureKey(role: StaffRole): string {
  return `staff-${role}`;
}

export function roomEquipmentTextureKey(kind: RoomKind): string {
  return `room-equipment-${kind}`;
}

function createFloorTextures(scene: Phaser.Scene): void {
  drawPixelTexture(scene, 'floor-tile', 16, 16, (draw) => {
    draw.fill('#dff8f0');
    draw.rect(0, 0, 16, 16, '#dff8f0');
    draw.rect(0, 15, 16, 1, '#bfeade');
    draw.rect(15, 0, 1, 16, '#bfeade');
    draw.rect(2, 2, 2, 2, '#f8fffb');
    draw.rect(10, 8, 1, 1, '#b8e4d6');
  });

  drawPixelTexture(scene, 'corridor-tile', 16, 16, (draw) => {
    draw.fill('#fff7df');
    draw.rect(0, 0, 16, 16, '#fff7df');
    draw.rect(0, 15, 16, 1, '#ead49b');
    draw.rect(15, 0, 1, 16, '#ead49b');
    draw.rect(3, 7, 10, 2, '#ffffff');
  });

  drawPixelTexture(scene, 'waiting-rug', 16, 16, (draw) => {
    draw.fill('#cdf7df');
    draw.rect(0, 0, 16, 16, '#cdf7df');
    draw.rect(2, 2, 12, 12, '#ecfff5');
    draw.rect(4, 4, 8, 8, '#b8edcf');
  });
}

function createPetTextures(scene: Phaser.Scene): void {
  const palettes: Record<PetKind, { body: string; shade: string; accent: string; eye: string }> = {
    dog: { body: '#c78a4a', shade: '#8f5d2e', accent: '#fff0c8', eye: '#2a1b12' },
    cat: { body: '#6d7d93', shade: '#3f4c63', accent: '#f6d7e5', eye: '#111827' },
    rabbit: { body: '#f8f5ed', shade: '#cfd8dc', accent: '#f7b6cf', eye: '#263238' },
    parrot: { body: '#28b779', shade: '#167a59', accent: '#ffd166', eye: '#12221e' },
  };

  for (const [kind, palette] of Object.entries(palettes) as Array<[PetKind, typeof palettes[PetKind]]>) {
    for (const frame of [0, 1] as const) {
      drawPixelTexture(scene, petTextureKey(kind, frame), 20, 22, (draw) => {
        const bob = frame === 0 ? 0 : 1;
        draw.clear();
        if (kind === 'rabbit') {
          draw.rect(6, 1 + bob, 3, 7, palette.body);
          draw.rect(11, 1 + bob, 3, 7, palette.body);
          draw.rect(7, 2 + bob, 1, 4, palette.accent);
          draw.rect(12, 2 + bob, 1, 4, palette.accent);
        }
        if (kind === 'cat') {
          draw.rect(5, 5 + bob, 3, 3, palette.body);
          draw.rect(12, 5 + bob, 3, 3, palette.body);
        }
        if (kind === 'parrot') {
          draw.rect(13, 7 + bob, 4, 3, palette.accent);
        }
        draw.rect(4, 8 + bob, 12, 9, palette.body);
        draw.rect(6, 5 + bob, 8, 7, palette.body);
        draw.rect(5, 14 + bob, 10, 4, palette.shade);
        draw.rect(8, 8 + bob, 2, 2, palette.eye);
        draw.rect(13, 8 + bob, 2, 2, palette.eye);
        draw.rect(10, 11 + bob, 3, 1, palette.accent);
        draw.rect(6, 18, 3, 2, palette.shade);
        draw.rect(12, 18, 3, 2, palette.shade);
        if (kind === 'dog') {
          draw.rect(3, 8 + bob, 3, 6, palette.shade);
          draw.rect(14, 8 + bob, 3, 6, palette.shade);
          draw.rect(9, 12 + bob, 4, 2, palette.accent);
        }
      });
    }
  }
}

function createStaffTextures(scene: Phaser.Scene): void {
  const palettes: Record<StaffRole, { coat: string; accent: string; hair: string }> = {
    vet: { coat: '#ffffff', accent: '#18a0fb', hair: '#5b3825' },
    nurse: { coat: '#f5f9ff', accent: '#f06292', hair: '#2f3b52' },
    tech: { coat: '#e9fff2', accent: '#16a34a', hair: '#523a28' },
  };

  for (const [role, palette] of Object.entries(palettes) as Array<[StaffRole, typeof palettes[StaffRole]]>) {
    drawPixelTexture(scene, staffTextureKey(role), 20, 24, (draw) => {
      draw.clear();
      draw.rect(7, 2, 7, 4, palette.hair);
      draw.rect(6, 5, 9, 7, '#ffd7b5');
      draw.rect(8, 8, 2, 1, '#263238');
      draw.rect(13, 8, 2, 1, '#263238');
      draw.rect(5, 12, 11, 9, palette.coat);
      draw.rect(5, 12, 11, 2, palette.accent);
      draw.rect(9, 15, 3, 5, '#c8f4e4');
      draw.rect(4, 14, 2, 6, '#ffd7b5');
      draw.rect(16, 14, 2, 6, '#ffd7b5');
      draw.rect(6, 21, 4, 2, '#31544e');
      draw.rect(12, 21, 4, 2, '#31544e');
    });
  }
}

function createRoomTextures(scene: Phaser.Scene): void {
  drawPixelTexture(scene, roomEquipmentTextureKey('exam'), 24, 22, (draw) => {
    draw.clear();
    draw.rect(3, 10, 18, 6, '#ffffff');
    draw.rect(5, 7, 14, 4, '#80d8ff');
    draw.rect(4, 16, 3, 5, '#18a0fb');
    draw.rect(17, 16, 3, 5, '#18a0fb');
    draw.rect(13, 3, 5, 5, '#cceeff');
    draw.rect(15, 0, 1, 4, '#18a0fb');
  });

  drawPixelTexture(scene, roomEquipmentTextureKey('grooming'), 24, 22, (draw) => {
    draw.clear();
    draw.rect(3, 12, 18, 5, '#ffffff');
    draw.rect(5, 8, 14, 4, '#fccde2');
    draw.rect(6, 4, 3, 3, '#ffffff');
    draw.rect(12, 2, 4, 4, '#ffffff');
    draw.rect(17, 5, 3, 3, '#ffffff');
    draw.rect(5, 17, 3, 4, '#f06292');
    draw.rect(16, 17, 3, 4, '#f06292');
  });

  drawPixelTexture(scene, roomEquipmentTextureKey('lab'), 24, 22, (draw) => {
    draw.clear();
    draw.rect(3, 14, 18, 5, '#ffffff');
    draw.rect(7, 5, 3, 9, '#dff8f0');
    draw.rect(14, 3, 3, 11, '#dff8f0');
    draw.rect(7, 11, 3, 3, '#16a34a');
    draw.rect(14, 8, 3, 6, '#80d8ff');
    draw.rect(5, 19, 14, 2, '#16a34a');
  });

  drawPixelTexture(scene, roomEquipmentTextureKey('recovery'), 24, 22, (draw) => {
    draw.clear();
    draw.rect(3, 12, 18, 5, '#ffe4a3');
    draw.rect(4, 8, 5, 4, '#ffffff');
    draw.rect(10, 8, 10, 4, '#ffd166');
    draw.rect(5, 17, 3, 4, '#f59e0b');
    draw.rect(16, 17, 3, 4, '#f59e0b');
    draw.rect(16, 3, 3, 3, '#fff3bd');
  });
}

function createFxTextures(scene: Phaser.Scene): void {
  drawPixelTexture(scene, 'fx-sparkle', 9, 9, (draw) => {
    draw.clear();
    draw.rect(4, 0, 1, 9, '#ffffff');
    draw.rect(0, 4, 9, 1, '#ffffff');
    draw.rect(3, 3, 3, 3, '#ffe66d');
  });

  drawPixelTexture(scene, 'fx-heart', 9, 8, (draw) => {
    draw.clear();
    draw.rect(1, 1, 3, 3, '#f06292');
    draw.rect(5, 1, 3, 3, '#f06292');
    draw.rect(2, 4, 5, 2, '#f06292');
    draw.rect(3, 6, 3, 1, '#f06292');
    draw.rect(4, 7, 1, 1, '#f06292');
  });

  drawPixelTexture(scene, 'fx-warning', 9, 9, (draw) => {
    draw.clear();
    draw.rect(4, 1, 1, 5, '#ef4444');
    draw.rect(4, 7, 1, 1, '#ef4444');
    draw.rect(3, 0, 3, 1, '#fff7df');
  });
}

function drawPixelTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  render: (draw: PixelDraw) => void,
): void {
  if (scene.textures.exists(key)) {
    return;
  }

  const texture = scene.textures.createCanvas(key, width * SCALE, height * SCALE);
  if (!texture) {
    return;
  }

  const context = texture.getContext();
  context.imageSmoothingEnabled = false;
  const draw = new PixelDraw(context, width, height);
  render(draw);
  texture.refresh();
}

class PixelDraw {
  public constructor(
    private context: CanvasRenderingContext2D,
    private width: number,
    private height: number,
  ) {}

  public clear(): void {
    this.context.clearRect(0, 0, this.width * SCALE, this.height * SCALE);
  }

  public fill(color: string): void {
    this.context.fillStyle = color;
    this.context.fillRect(0, 0, this.width * SCALE, this.height * SCALE);
  }

  public rect(x: number, y: number, width: number, height: number, color: string): void {
    this.context.fillStyle = color;
    this.context.fillRect(x * SCALE, y * SCALE, width * SCALE, height * SCALE);
  }
}
