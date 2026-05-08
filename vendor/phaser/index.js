const Phaser={VERSION:'3.90.0-clean-demo',AUTO:'AUTO',Scale:{FIT:'FIT',CENTER_BOTH:'CENTER_BOTH'},Math:{Clamp:(v,min,max)=>Math.max(min,Math.min(max,v)),Distance:{Between:(x1,y1,x2,y2)=>Math.hypot(x2-x1,y2-y1)}}};
Phaser.Game=class{constructor(config={}){this.config=config;console.info(`[Phaser ${Phaser.VERSION}] ${config.title||'Game'} booted`);}};
export default Phaser;
export const VERSION=Phaser.VERSION;
