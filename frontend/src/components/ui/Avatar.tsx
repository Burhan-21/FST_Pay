interface AvatarProps {
  name?: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap: Record<string, { container: string; text: string }> = {
  xs: { container: 'w-6 h-6', text: 'text-[0.6rem]' },
  sm: { container: 'w-8 h-8', text: 'text-xs' },
  md: { container: 'w-10 h-10', text: 'text-sm' },
  lg: { container: 'w-12 h-12', text: 'text-base' },
  xl: { container: 'w-16 h-16', text: 'text-lg' },
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

const colorPalette = [
  'from-indigo-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-pink-500 to-rose-600',
  'from-cyan-500 to-blue-600',
  'from-violet-500 to-fuchsia-600',
];

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colorPalette[Math.abs(hash) % colorPalette.length];
}

export default function Avatar({ name = '?', src, size = 'md', className = '' }: AvatarProps) {
  const { container, text } = sizeMap[size];

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${container} rounded-full object-cover ring-2 ring-surface-700/30 ${className}`}
      />
    );
  }

  const gradient = getColorFromName(name);
  return (
    <div
      className={`${container} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center ring-2 ring-white/10 ${className}`}
    >
      <span className={`${text} font-semibold text-white select-none`}>
        {getInitials(name)}
      </span>
    </div>
  );
}
