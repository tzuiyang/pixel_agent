export class SpeechBubble {
  private text: string = '';
  private visible: boolean = false;
  private opacity: number = 0;
  private style: 'normal' | 'thought' | 'success' | 'error' | 'waiting' = 'normal';
  private pulsePhase: number = 0;

  setText(text: string, style: SpeechBubble['style'] = 'normal') {
    this.text = text.length > 30 ? text.substring(0, 27) + '...' : text;
    this.style = style;
    this.visible = true;
  }

  hide() {
    this.visible = false;
  }

  update(deltaMs: number) {
    // Fade in/out
    const targetOpacity = this.visible ? 1 : 0;
    this.opacity += (targetOpacity - this.opacity) * Math.min(deltaMs * 0.008, 1);
    if (this.opacity < 0.01) this.opacity = 0;

    // Pulse for waiting state
    this.pulsePhase += deltaMs * 0.004;
  }

  draw(ctx: CanvasRenderingContext2D, x: number, y: number) {
    if (this.opacity < 0.01 || !this.text) return;

    ctx.save();
    ctx.globalAlpha = this.opacity;

    const padding = 6;
    ctx.font = '10px monospace';
    const metrics = ctx.measureText(this.text);
    const textWidth = metrics.width;
    const bubbleWidth = textWidth + padding * 2;
    const bubbleHeight = 18;
    const bubbleX = x - bubbleWidth / 2;
    const bubbleY = y - bubbleHeight - 8;

    // Pulse effect for waiting
    if (this.style === 'waiting') {
      ctx.globalAlpha = this.opacity * (0.7 + Math.sin(this.pulsePhase) * 0.3);
    }

    // Background color based on style
    const bgColors = {
      normal: 'rgba(26, 26, 58, 0.95)',
      thought: 'rgba(40, 30, 60, 0.95)',
      success: 'rgba(6, 80, 50, 0.95)',
      error: 'rgba(80, 20, 20, 0.95)',
      waiting: 'rgba(50, 40, 10, 0.95)',
    };

    // Draw bubble
    ctx.fillStyle = bgColors[this.style];
    ctx.beginPath();
    ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 4);
    ctx.fill();

    // Border
    const borderColors = {
      normal: '#4A4A8A',
      thought: '#6A5AAA',
      success: '#06D6A0',
      error: '#EF476F',
      waiting: '#FFD166',
    };
    ctx.strokeStyle = borderColors[this.style];
    ctx.lineWidth = 1;
    ctx.stroke();

    // Pointer triangle
    ctx.fillStyle = bgColors[this.style];
    ctx.beginPath();
    ctx.moveTo(x - 4, bubbleY + bubbleHeight);
    ctx.lineTo(x, bubbleY + bubbleHeight + 5);
    ctx.lineTo(x + 4, bubbleY + bubbleHeight);
    ctx.fill();

    // Text
    ctx.fillStyle = '#E8E8F8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.text, x, bubbleY + bubbleHeight / 2);

    ctx.restore();
  }
}
