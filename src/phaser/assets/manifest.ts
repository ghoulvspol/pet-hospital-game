import type { PetKind, RoomKind, StaffRole } from '../../game/simulation/types';

export const PET_ASSET_KEYS: Record<PetKind, string> = {
  dog: 'asset-pet-dog',
  cat: 'asset-pet-cat',
  rabbit: 'asset-pet-rabbit',
  parrot: 'asset-pet-parrot',
};

export const PET_WALK_ASSET_KEYS: Record<PetKind, string> = {
  dog: 'asset-pet-dog-walk',
  cat: 'asset-pet-cat-walk',
  rabbit: 'asset-pet-rabbit-walk',
  parrot: 'asset-pet-parrot-walk',
};

export const STAFF_ASSET_KEYS: Record<StaffRole, string> = {
  vet: 'asset-staff-vet',
  nurse: 'asset-staff-nurse',
  tech: 'asset-staff-tech',
};

export const TILE_ASSET_KEYS = {
  floor: 'asset-floor-tile',
  corridor: 'asset-corridor-tile',
  waiting: 'asset-waiting-rug',
};

export const ROOM_EQUIPMENT_ASSET_KEYS: Record<RoomKind, string> = {
  exam: 'asset-room-equipment-exam',
  grooming: 'asset-room-equipment-grooming',
  lab: 'asset-room-equipment-lab',
  recovery: 'asset-room-equipment-recovery',
};

export const FX_ASSET_KEYS = {
  sparkle: 'asset-fx-sparkle',
  heart: 'asset-fx-heart',
  warning: 'asset-fx-warning',
};

export function preloadPixelAssets(scene: Phaser.Scene): void {
  scene.load.image(PET_ASSET_KEYS.dog, '/assets/characters/pet-dog.png');
  scene.load.image(PET_ASSET_KEYS.cat, '/assets/characters/pet-cat.png');
  scene.load.image(PET_ASSET_KEYS.rabbit, '/assets/characters/pet-rabbit.png');
  scene.load.image(PET_ASSET_KEYS.parrot, '/assets/characters/pet-parrot.png');
  scene.load.image(PET_WALK_ASSET_KEYS.dog, '/assets/characters/pet-dog-walk.png');
  scene.load.image(PET_WALK_ASSET_KEYS.cat, '/assets/characters/pet-cat-walk.png');
  scene.load.image(PET_WALK_ASSET_KEYS.rabbit, '/assets/characters/pet-rabbit-walk.png');
  scene.load.image(PET_WALK_ASSET_KEYS.parrot, '/assets/characters/pet-parrot-walk.png');
  scene.load.image(STAFF_ASSET_KEYS.vet, '/assets/characters/staff-vet.png');
  scene.load.image(STAFF_ASSET_KEYS.nurse, '/assets/characters/staff-nurse.png');
  scene.load.image(STAFF_ASSET_KEYS.tech, '/assets/characters/staff-tech.png');
  scene.load.image(TILE_ASSET_KEYS.floor, '/assets/environment/floor-tile.png');
  scene.load.image(TILE_ASSET_KEYS.corridor, '/assets/environment/corridor-tile.png');
  scene.load.image(TILE_ASSET_KEYS.waiting, '/assets/environment/waiting-rug.png');
  scene.load.image(ROOM_EQUIPMENT_ASSET_KEYS.exam, '/assets/environment/room-equipment-exam.png');
  scene.load.image(ROOM_EQUIPMENT_ASSET_KEYS.grooming, '/assets/environment/room-equipment-grooming.png');
  scene.load.image(ROOM_EQUIPMENT_ASSET_KEYS.lab, '/assets/environment/room-equipment-lab.png');
  scene.load.image(ROOM_EQUIPMENT_ASSET_KEYS.recovery, '/assets/environment/room-equipment-recovery.png');
  scene.load.image(FX_ASSET_KEYS.sparkle, '/assets/fx/sparkle.png');
  scene.load.image(FX_ASSET_KEYS.heart, '/assets/fx/heart.png');
  scene.load.image(FX_ASSET_KEYS.warning, '/assets/fx/warning.png');
}
