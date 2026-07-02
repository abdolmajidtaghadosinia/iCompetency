
class AudioService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    try {
      this.isMuted = localStorage.getItem('sfx_muted') === 'true';
    } catch(e) {}
  }

  private init() {
    if (!this.ctx) {
      // @ts-ignore
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('sfx_muted', String(this.isMuted));
    return this.isMuted;
  }

  public get muted() { return this.isMuted; }

  // --- Professional UI Sounds (Subtle & Clean) ---

  // Soft "Tick" for hover - very subtle
  playHover() {
    if (this.isMuted) return;
    const ctx = this.init();
    if(!ctx) return;
    
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // Sine wave is softer and more professional than square/saw
    osc.type = 'sine'; 
    osc.frequency.setValueAtTime(800, t);
    
    // Very short envelope
    gain.gain.setValueAtTime(0.02, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    
    osc.start(t);
    osc.stop(t + 0.03);
  }

  // Mechanical "Click" for buttons
  playClick() {
    if (this.isMuted) return;
    const ctx = this.init();
    if(!ctx) return;
    
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'triangle'; // Slightly more body than sine
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.05); // Pitch drop simulates mechanical switch
    
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    
    osc.start(t);
    osc.stop(t + 0.05);
  }

  // "Correct" - A pleasant, modern notification chime (Major 3rd)
  playSuccess() {
    if (this.isMuted) return;
    const ctx = this.init();
    if(!ctx) return;
    
    const t = ctx.currentTime;
    
    // Note 1: C5
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, t); 
    gain1.gain.setValueAtTime(0, t);
    gain1.gain.linearRampToValueAtTime(0.1, t + 0.02); // Soft attack
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc1.start(t);
    osc1.stop(t + 0.4);

    // Note 2: E5 (delayed slightly)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, t + 0.08); 
    gain2.gain.setValueAtTime(0, t + 0.08);
    gain2.gain.linearRampToValueAtTime(0.1, t + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc2.start(t + 0.08);
    osc2.stop(t + 0.5);
  }

  // "Error" - A low, neutral thud. Not a buzzing alarm.
  playError() {
    if (this.isMuted) return;
    const ctx = this.init();
    if(!ctx) return;
    
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.linearRampToValueAtTime(100, t + 0.15);
    
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    
    osc.start(t);
    osc.stop(t + 0.15);
  }

  // "Task Complete" - An ascending major triad (Professional accomplishment sound)
  playWin() {
    if (this.isMuted) return;
    const ctx = this.init();
    if(!ctx) return;
    
    const t = ctx.currentTime;
    // C Major Arpeggio: C5 - E5 - G5
    const notes = [523.25, 659.25, 783.99]; 
    
    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine'; // Pure tone
        osc.frequency.value = freq;
        
        const startTime = t + (i * 0.12);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.08, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
        
        osc.start(startTime);
        osc.stop(startTime + 0.5);
    });
  }
}

export const sfx = new AudioService();
