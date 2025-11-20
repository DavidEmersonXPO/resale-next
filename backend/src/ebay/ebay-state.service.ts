import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

@Injectable()
export class EbayStateService {
  private readonly states = new Map<string, number>();

  createState(): string {
    const state = randomBytes(16).toString('hex');
    this.states.set(state, Date.now());
    setTimeout(() => this.states.delete(state), 5 * 60 * 1000);
    return state;
  }

  validate(state?: string): boolean {
    if (!state) return false;
    return this.states.delete(state);
  }
}
