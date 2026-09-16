import { useState, useRef, useCallback } from 'react';
import { BACKGROUNDS, PHOTO_BACKGROUNDS } from '../constants';
import { IoClose, IoSearch } from 'react-icons/io5';

const UNSPLASH_ACCESS_KEY = 'loC0kf5_pwyxDC76zh1sidQpwvJah17evxkrrOiDGM0';

interface UnsplashPhoto {
  id: string;
  urls: { raw: string; small: string };
  user: { name: string; links: { html: string } };
  links: { html: string; download_location: string };
}

interface Props {
  current: string;
  onChange: (bg: string) => void;
  onClose: () => void;
}

export default function BackgroundPicker({ current, onChange, onClose }: Props) {
  const handlePhoto = (url: string) => {
    onChange(`url(${url}?w=1920&q=80)`);
  };

  const isPhotoSelected = (url: string) => current.includes(url);

  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  // Unsplash 검색 상태
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UnsplashPhoto[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const debounceRef = useRef<number>(0);

  const searchUnsplash = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      setSearchError('');
      return;
    }
    setSearching(true);
    setSearchError('');
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=12&orientation=landscape`,
        { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }
      );
      if (!res.ok) {
        if (res.status === 403) setSearchError('API 한도 초과. 잠시 후 다시 시도해주세요.');
        else setSearchError('검색 실패');
        setSearchResults([]);
        return;
      }
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch {
      setSearchError('네트워크 오류');
    } finally {
      setSearching(false);
    }
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => searchUnsplash(value), 500);
  };

  const handleSearchPhoto = (photo: UnsplashPhoto) => {
    // Unsplash API 가이드라인: download_location 트리거
    fetch(`${photo.links.download_location}?client_id=${UNSPLASH_ACCESS_KEY}`).catch(() => {});
    handlePhoto(photo.urls.raw);
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ padding: '28px 32px', width: '520px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>배경 설정</h2>
          <button
            onClick={onClose}
            style={{ padding: '4px', borderRadius: '50%', cursor: 'pointer', background: 'none', border: 'none' }}
          >
            <IoClose size={22} />
          </button>
        </div>

        {/* 검색바 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 14px',
          borderRadius: '10px',
          border: '2px solid #e2e8f0',
          marginBottom: '20px',
          background: '#f8fafc',
        }}>
          <IoSearch size={18} color="#94a3b8" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="배경 사진 검색 (예: 교실, 봄, 바다...)"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '14px',
              color: '#334155',
            }}
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setSearchResults([]); setSearchError(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
            >
              <IoClose size={16} color="#94a3b8" />
            </button>
          )}
        </div>

        {/* 스크롤 영역 */}
        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>

          {/* 검색 결과 */}
          {(searchResults.length > 0 || searching || searchError) && (
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '10px' }}>
                검색 결과
                {searching && ' — 검색 중...'}
              </p>

              {searchError && (
                <p style={{ fontSize: '13px', color: '#ef4444', marginBottom: '10px' }}>{searchError}</p>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {searchResults.map((photo) => (
                  <button
                    key={photo.id}
                    onClick={() => handleSearchPhoto(photo)}
                    style={{
                      width: '100%',
                      aspectRatio: '16/10',
                      borderRadius: '10px',
                      border: isPhotoSelected(photo.urls.raw) ? '3px solid #6366f1' : '2px solid transparent',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      position: 'relative',
                      background: '#f1f5f9',
                      transition: 'all 0.15s',
                      transform: isPhotoSelected(photo.urls.raw) ? 'scale(1.03)' : 'none',
                      boxShadow: isPhotoSelected(photo.urls.raw) ? '0 4px 12px rgba(99,102,241,0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
                      padding: 0,
                    }}
                  >
                    <img
                      src={`${photo.urls.small}`}
                      alt=""
                      loading="lazy"
                      onLoad={() => setLoadedImages((prev) => new Set(prev).add(photo.urls.raw))}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                        opacity: loadedImages.has(photo.urls.raw) ? 1 : 0,
                        transition: 'opacity 0.3s',
                      }}
                    />
                    {!loadedImages.has(photo.urls.raw) && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '20px', height: '20px', border: '2px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      </div>
                    )}
                    {/* Unsplash Attribution (API 가이드라인) */}
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: '3px 6px',
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                      fontSize: '8px',
                      color: 'white',
                      textAlign: 'right',
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: '3px',
                    }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <a
                        href={`${photo.user.links.html}?utm_source=classboard&utm_medium=referral`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'white', textDecoration: 'underline' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {photo.user.name}
                      </a>
                      <span>/</span>
                      <a
                        href="https://unsplash.com/?utm_source=classboard&utm_medium=referral"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'white', textDecoration: 'underline' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Unsplash
                      </a>
                    </div>
                  </button>
                ))}
              </div>

              {searchResults.length > 0 && (
                <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '8px', textAlign: 'center' }}>
                  Photos by <a href="https://unsplash.com/?utm_source=classboard&utm_medium=referral" target="_blank" rel="noopener noreferrer" style={{ color: '#94a3b8', textDecoration: 'underline' }}>Unsplash</a>
                </p>
              )}
            </div>
          )}

          {/* 사진 배경 카테고리들 */}
          {PHOTO_BACKGROUNDS.map((category) => (
            <div key={category.name}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '10px' }}>
                {category.name}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '24px' }}>
                {category.photos.map((url) => (
                  <button
                    key={url}
                    onClick={() => handlePhoto(url)}
                    style={{
                      width: '100%',
                      aspectRatio: '16/10',
                      borderRadius: '10px',
                      border: isPhotoSelected(url) ? '3px solid #6366f1' : '2px solid transparent',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      position: 'relative',
                      background: '#f1f5f9',
                      transition: 'all 0.15s',
                      transform: isPhotoSelected(url) ? 'scale(1.03)' : 'none',
                      boxShadow: isPhotoSelected(url) ? '0 4px 12px rgba(99,102,241,0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
                      padding: 0,
                    }}
                  >
                    <img
                      src={`${url}?w=300&q=60`}
                      alt=""
                      loading="lazy"
                      onLoad={() => setLoadedImages((prev) => new Set(prev).add(url))}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                        opacity: loadedImages.has(url) ? 1 : 0,
                        transition: 'opacity 0.3s',
                      }}
                    />
                    {!loadedImages.has(url) && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '20px', height: '20px', border: '2px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* 그라데이션 */}
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '10px' }}>그라데이션</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '24px' }}>
            {BACKGROUNDS.map((bg) => (
              <button
                key={bg}
                onClick={() => onChange(bg)}
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: '12px',
                  border: current === bg ? '3px solid #6366f1' : '2px solid transparent',
                  background: bg,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  transform: current === bg ? 'scale(1.05)' : 'none',
                  boxShadow: current === bg ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
                }}
              />
            ))}
          </div>

          {/* 단색 */}
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '10px' }}>단색</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', marginBottom: '24px' }}>
            {[
              '#ffffff', '#f1f5f9', '#e2e8f0', '#1e293b', '#0f172a', '#000000',
              '#fef2f2', '#fef9c3', '#f0fdf4', '#eff6ff', '#faf5ff', '#fff1f2',
            ].map((color) => (
              <button
                key={color}
                onClick={() => onChange(color)}
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: '8px',
                  border: current === color ? '3px solid #6366f1' : '2px solid #e2e8f0',
                  backgroundColor: color,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  transform: current === color ? 'scale(1.05)' : 'none',
                }}
              />
            ))}
          </div>

          {/* 직접 선택 */}
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '10px' }}>직접 선택</p>
          <input
            type="color"
            value={current.startsWith('#') ? current : '#667eea'}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: '100%',
              height: '40px',
              borderRadius: '8px',
              cursor: 'pointer',
              border: '1px solid #e2e8f0',
              marginBottom: '8px',
            }}
          />
        </div>
      </div>

      {/* 스피너 애니메이션 */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
