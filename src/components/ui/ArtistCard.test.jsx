import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ArtistCard from './ArtistCard';
import albumArtPlaceholder from '../../assets/album_art_placeholder.svg';
import apiService from '../../services/api';

jest.mock('../../contexts/MusicContext', () => ({
  useMusic: () => ({ playTrack: jest.fn() })
}));

jest.mock('react-router-dom', () => ({
  Link: ({ children }) => <div>{children}</div>
}), { virtual: true });

jest.mock('../../services/api', () => {
  const originalModule = jest.requireActual('../../services/api');
  return {
    __esModule: true,
    default: {
      ...originalModule.default,
      getArtist: jest.fn()
    }
  };
});

const wrap = (ui) => render(ui);

describe('ArtistCard image loading', () => {
  const artistBase = { name: 'Test Artist', id: '123' };

  it('uses provided artist image when available', async () => {
    const artist = { ...artistBase, images: [{ url: 'https://example.com/img.jpg' }] };
    wrap(<ArtistCard artist={artist} index={0} />);
    const img = await screen.findByAltText('Test Artist');
    await waitFor(() => expect(img.getAttribute('src')).toBe('https://example.com/img.jpg'));
  });

  it('fetches full artist when no image in props and id present', async () => {
    apiService.getArtist.mockResolvedValueOnce({
      images: [{ url: 'https://example.com/fetched.jpg' }]
    });
    const artist = { ...artistBase }; // no images
    wrap(<ArtistCard artist={artist} index={0} />);
    const img = await screen.findByAltText('Test Artist');
    await waitFor(() => expect(img.getAttribute('src')).toBe('https://example.com/fetched.jpg'));
  });

  it('falls back to placeholder when no id provided', async () => {
    const artist = { name: 'No ID Artist' };
    wrap(<ArtistCard artist={artist} index={0} />);
    const img = await screen.findByAltText('No ID Artist');
    await waitFor(() => expect(img.getAttribute('src')).toBe(albumArtPlaceholder));
  });

  it('falls back to placeholder when API throws', async () => {
    apiService.getArtist.mockRejectedValueOnce(new Error('Network error'));
    const artist = { ...artistBase }; // no images to force fetch
    wrap(<ArtistCard artist={artist} index={0} />);
    const img = await screen.findByAltText('Test Artist');
    await waitFor(() => expect(img.getAttribute('src')).toBe(albumArtPlaceholder));
  });

  it('sets placeholder on image error', async () => {
    const artist = { ...artistBase, images: [{ url: 'https://bad.example.com/img.jpg' }] };
    wrap(<ArtistCard artist={artist} index={0} />);
    const img = await screen.findByAltText('Test Artist');
    fireEvent.error(img);
    await waitFor(() => expect(img.getAttribute('src')).toBe(albumArtPlaceholder));
  });
});
