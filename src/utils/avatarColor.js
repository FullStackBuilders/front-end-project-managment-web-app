const AVATAR_PALETTE = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-green-500',
  'bg-pink-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-rose-500',
];

/**
 * Maps a user's display name to a deterministic background color class.
 * Same name always returns the same color — no backend storage needed.
 *
 * @param {string} name - The user's full name (or any stable identifier).
 * @returns {string} A Tailwind bg-* class string.
 */
export function getAvatarColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % AVATAR_PALETTE.length;
  }
  return AVATAR_PALETTE[Math.abs(hash)];
}
