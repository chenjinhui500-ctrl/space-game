import { GENERATED_ASSETS, getGeneratedAssetPath } from './generatedAssetIndex.js';

// P0 semantic asset path map for future Canvas image integration.
// The manifest remains the source of truth: these aliases resolve through
// GENERATED_ASSETS first, with literal fallbacks only to keep the current
// no-dependency prototype safe if the generated index is temporarily stale.

const FALLBACK_ASSETS = Object.freeze({
  ship_player_t1_explorer: 'assets/final/ships/ship_player_t1_explorer.png',
  effect_thruster_flame_basic: 'assets/final/effects/effect_thruster_flame_basic.png',
  weapon_laser_basic: 'assets/final/weapons/weapon_laser_basic.png',
  enemy_basic_small_ship: 'assets/final/enemies/enemy_basic_small_ship.png',
  planet_fire_war: 'assets/final/planets/planet_fire_war.png',
  planet_rock_mining: 'assets/final/planets/planet_rock_mining.png',
  planet_hive_breeding: 'assets/final/planets/planet_hive_breeding.png',
  effect_planet_range_outer_basic: 'assets/final/effects/effect_planet_range_outer_basic.png',
  station_rest_basic: 'assets/final/stations/station_rest_basic.png',
  ui_icon_rest_station: 'assets/final/ui/ui_icon_rest_station.png',
  resource_exp_orb: 'assets/final/resources/resource_exp_orb.png',
  ui_icon_hp: 'assets/final/ui/ui_icon_hp.png',
  ui_icon_shield: 'assets/final/ui/ui_icon_shield.png',
  ui_icon_xp: 'assets/final/ui/ui_icon_xp.png',
  ui_icon_level: 'assets/final/ui/ui_icon_level.png',
  ui_icon_kill: 'assets/final/ui/ui_icon_kill.png',
  ui_icon_timer: 'assets/final/ui/ui_icon_timer.png',
  effect_small_explosion: 'assets/final/effects/effect_small_explosion.png',
  bg_deep_space_main: 'assets/final/backgrounds/bg_deep_space_main.png',
});

export function getAssetPathById(assetId) {
  return getGeneratedAssetPath(assetId) ?? FALLBACK_ASSETS[assetId] ?? null;
}

export const ASSET_PATHS = Object.freeze({
  player: {
    shipT1: getAssetPathById('ship_player_t1_explorer'),
    thrusterFlame: getAssetPathById('effect_thruster_flame_basic'),
  },
  weapons: {
    basicLaser: getAssetPathById('weapon_laser_basic'),
  },
  enemies: {
    basicSmallShip: getAssetPathById('enemy_basic_small_ship'),
  },
  planets: {
    fireWar: getAssetPathById('planet_fire_war'),
    rockMining: getAssetPathById('planet_rock_mining'),
    hiveBreeding: getAssetPathById('planet_hive_breeding'),
    outerRange: getAssetPathById('effect_planet_range_outer_basic'),
  },
  stations: {
    restBasic: getAssetPathById('station_rest_basic'),
    restIcon: getAssetPathById('ui_icon_rest_station'),
  },
  resources: {
    expOrb: getAssetPathById('resource_exp_orb'),
  },
  ui: {
    hp: getAssetPathById('ui_icon_hp'),
    shield: getAssetPathById('ui_icon_shield'),
    xp: getAssetPathById('ui_icon_xp'),
    level: getAssetPathById('ui_icon_level'),
    kill: getAssetPathById('ui_icon_kill'),
    timer: getAssetPathById('ui_icon_timer'),
  },
  effects: {
    smallExplosion: getAssetPathById('effect_small_explosion'),
  },
  backgrounds: {
    deepSpaceMain: getAssetPathById('bg_deep_space_main'),
  },
});

export { GENERATED_ASSETS };

export function getAssetPath(group, key) {
  return ASSET_PATHS[group]?.[key] ?? null;
}
