import { describe, expect, it } from 'vitest';
import { avatarImage } from './avatar';

describe('avatarImage', () => {
  it('shows an uploaded photo', () => {
    expect(avatarImage({ type: 'CUSTOM_UPLOAD', imageUrl: '/uploads/a.jpg' })).toBe('/uploads/a.jpg');
  });

  it('leaves a predefined avatar to the initial, since no picture is shipped behind its path', () => {
    expect(avatarImage({ type: 'PREDEFINED', imageUrl: '/avatars/default.png' })).toBeUndefined();
  });

  it('has nothing to show without an avatar', () => {
    expect(avatarImage(null)).toBeUndefined();
    expect(avatarImage(undefined)).toBeUndefined();
  });
});
