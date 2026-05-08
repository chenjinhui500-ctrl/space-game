// P0 asset path map for future Canvas image integration.
// The current prototype still renders procedural shapes, but these stable paths
// allow the game loop to swap in generated PNGs without changing naming rules.

export const ASSET_PATHS = Object.freeze({
  player: {
    shipT1: 'assets/final/ships/ship_player_t1_explorer.png',
    thrusterFlame: 'assets/final/effects/effect_thruster_flame_basic.png',
  },
  weapons: {
    basicLaser: 'assets/final/weapons/weapon_laser_basic.png',
  },
  enemies: {
    basicSmallShip: 'assets/final/enemies/enemy_basic_small_ship.png',
  },
  planets: {
    fireWar: 'assets/final/planets/planet_fire_war.png',
    rockMining: 'assets/final/planets/planet_rock_mining.png',
    hiveBreeding: 'assets/final/planets/planet_hive_breeding.png',
    outerRange: 'assets/final/effects/effect_planet_range_outer_basic.png',
  },
  stations: {
    restBasic: 'assets/final/stations/station_rest_basic.png',
    restIcon: 'assets/final/ui/ui_icon_rest_station.png',
  },
  resources: {
    expOrb: 'assets/final/resources/resource_exp_orb.png',
  },
  ui: {
    hp: 'assets/final/ui/ui_icon_hp.png',
    shield: 'assets/final/ui/ui_icon_shield.png',
    xp: 'assets/final/ui/ui_icon_xp.png',
    level: 'assets/final/ui/ui_icon_level.png',
    kill: 'assets/final/ui/ui_icon_kill.png',
    timer: 'assets/final/ui/ui_icon_timer.png',
  },
  effects: {
    smallExplosion: 'assets/final/effects/effect_small_explosion.png',
  },
  backgrounds: {
    deepSpaceMain: 'assets/final/backgrounds/bg_deep_space_main.png',
  },
});

export function getAssetPath(group, key) {
  return ASSET_PATHS[group]?.[key] ?? null;
}
