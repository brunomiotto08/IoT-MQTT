// Sistema de Sons de Notificação

class SoundManager {
  constructor() {
    this.sounds = {
      // Sons para limites MÁXIMOS excedidos (graves/intensos)
      critica: this.createBeep(800, 0.3, 'square'),     // Som grave e intenso
      alta: this.createBeep(600, 0.2, 'sine'),          // Som médio grave
      media: this.createBeep(500, 0.15, 'sine'),        // Som suave
      baixa: this.createBeep(400, 0.1, 'sine'),         // Som discreto
      
      // Sons para limites MÍNIMOS não atingidos (agudos/diferentes)
      critica_min: this.createBeep(1200, 0.25, 'sine'), // Som agudo para crítico baixo
      alta_min: this.createBeep(1000, 0.18, 'sine'),    // Som agudo médio
      media_min: this.createBeep(900, 0.12, 'sine'),    // Som agudo suave
      baixa_min: this.createBeep(800, 0.08, 'sine')     // Som agudo discreto
    };
    
    this.enabled = true;
  }

  /**
   * Criar beep usando Web Audio API
   */
  createBeep(frequency, volume, type = 'sine') {
    return () => {
      if (!this.enabled) return;

      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;

        gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      } catch (err) {
        console.warn('Erro ao tocar som:', err);
      }
    };
  }

  /**
   * Tocar som baseado na prioridade e tipo (máximo/mínimo)
   * @param {string} prioridade - 'critica', 'alta', 'media', 'baixa'
   * @param {string} tipo - 'max' (limite excedido) ou 'min' (abaixo do mínimo)
   */
  play(prioridade = 'media', tipo = 'max') {
    // Selecionar o som correto baseado no tipo
    const soundKey = tipo === 'min' ? `${prioridade}_min` : prioridade;
    const sound = this.sounds[soundKey] || this.sounds.media;
    
    // Para notificações críticas, tocar 2 vezes
    if (prioridade === 'critica') {
      sound();
      setTimeout(sound, 150);
    } else {
      sound();
    }
  }

  /**
   * Ativar/desativar sons
   */
  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  /**
   * Verificar se está habilitado
   */
  isEnabled() {
    return this.enabled;
  }
}

// Instância singleton
const soundManager = new SoundManager();

export default soundManager;

