export const readAudioDurationFromUrl = (src) => new Promise((resolve, reject) => {
  if (!src) {
    reject(new Error('No audio source provided'));
    return;
  }

  const audio = new Audio();
  let settled = false;

  const cleanup = () => {
    audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    audio.removeEventListener('durationchange', handleLoadedMetadata);
    audio.removeEventListener('error', handleError);
    audio.removeAttribute('src');
    audio.load();
  };

  const finish = (callback, value) => {
    if (settled) return;
    settled = true;
    cleanup();
    callback(value);
  };

  const handleLoadedMetadata = () => {
    const durationSeconds = Number(audio.duration);
    if (Number.isFinite(durationSeconds) && durationSeconds > 0) {
      finish(resolve, Math.round(durationSeconds * 1000));
    }
  };

  const handleError = () => {
    finish(reject, new Error('Failed to read audio duration'));
  };

  audio.preload = 'metadata';
  audio.addEventListener('loadedmetadata', handleLoadedMetadata);
  audio.addEventListener('durationchange', handleLoadedMetadata);
  audio.addEventListener('error', handleError);
  audio.src = src;
  audio.load();
});

export const readAudioDurationFromFile = async (file) => {        //Reads duration of audio file 
  if (!file) {
    throw new Error('No audio file provided');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    return await readAudioDurationFromUrl(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export const formatDurationFromMs = (durationMs) => {
  const totalSeconds = Math.max(0, Math.round(Number(durationMs || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};
