import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Trash2, 
  Image as ImageIcon, 
  Film, 
  Tv, 
  Plus, 
  AlertCircle, 
  Check, 
  RefreshCw, 
  Layers, 
  Sparkles,
  Link,
  Calendar,
  FileText,
  Play
} from 'lucide-react';
import type { Video, Episode } from '../types';

interface LiveEditModalProps {
  video: Video | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedVideo: Video) => Promise<boolean>;
  onDelete?: (videoId: string) => Promise<boolean>;
}

export default function LiveEditModal({
  video,
  isOpen,
  onClose,
  onSave,
  onDelete
}: LiveEditModalProps) {
  if (!isOpen || !video) return null;

  const [activeTab, setActiveTab] = useState<'info' | 'images' | 'episodes'>('info');
  const [title, setTitle] = useState(video.title || '');
  const [description, setDescription] = useState(video.description || '');
  const [thumbnail, setThumbnail] = useState(video.thumbnail || '');
  const [backdrop, setBackdrop] = useState(video.backdrop || '');
  const [year, setYear] = useState(video.year || '');
  const [type, setType] = useState<'movie' | 'series'>(video.type || 'series');
  const [category, setCategory] = useState<'gctunes' | 'greek_streaming'>(video.category || 'gctunes');
  const [url, setUrl] = useState(video.url || '');
  const [episodes, setEpisodes] = useState<Episode[]>(
    video.episodes ? JSON.parse(JSON.stringify(video.episodes)) : []
  );

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState(false);

  // Sync state whenever selected video changes
  useEffect(() => {
    if (video) {
      setTitle(video.title || '');
      setDescription(video.description || '');
      setThumbnail(video.thumbnail || '');
      setBackdrop(video.backdrop || '');
      setYear(video.year || '');
      setType(video.type || 'series');
      setCategory(video.category || 'gctunes');
      setUrl(video.url || '');
      setEpisodes(video.episodes ? JSON.parse(JSON.stringify(video.episodes)) : []);
      setError(null);
      setSuccessToast(false);
    }
  }, [video]);

  // Episode Handlers
  const handleAddEpisode = () => {
    const nextEpNum = episodes.length > 0 ? Math.max(...episodes.map(e => e.episodeNumber || 1)) + 1 : 1;
    const newEp: Episode = {
      id: `ep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      episodeNumber: nextEpNum,
      title: `Επεισόδιο ${nextEpNum}`,
      description: `Επεισόδιο ${nextEpNum} της σειράς ${title || 'νέας σειράς'}.`,
      thumbnail: thumbnail || '',
      url: ''
    };
    setEpisodes([...episodes, newEp]);
  };

  const handleUpdateEpisode = (index: number, field: keyof Episode, value: any) => {
    const updated = [...episodes];
    updated[index] = { ...updated[index], [field]: value };
    setEpisodes(updated);
  };

  const handleDeleteEpisode = (index: number) => {
    const updated = episodes.filter((_, i) => i !== index);
    setEpisodes(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Ο τίτλος είναι υποχρεωτικός.');
      return;
    }

    setSaving(true);
    setError(null);

    const updatedVideoData: Video = {
      ...video,
      title: title.trim(),
      description: description.trim(),
      thumbnail: thumbnail.trim(),
      backdrop: backdrop.trim(),
      year: year.trim(),
      type,
      category,
      url: url.trim(),
      episodes: type === 'series' ? episodes : []
    };

    const success = await onSave(updatedVideoData);
    setSaving(false);

    if (success) {
      setSuccessToast(true);
      setTimeout(() => {
        setSuccessToast(false);
        onClose();
      }, 700);
    } else {
      setError('Αποτυχία κατά την αποθήκευση. Ελέγξτε αν έχετε δικαιώματα διαχειριστή.');
    }
  };

  const handleDeleteVideo = async () => {
    if (!onDelete) return;
    const confirmDelete = window.confirm(`Είστε σίγουροι ότι θέλετε να διαγράψετε οριστικά τον τίτλο "${video.title}";`);
    if (!confirmDelete) return;

    setDeleting(true);
    const success = await onDelete(video.id);
    setDeleting(false);

    if (success) {
      onClose();
    } else {
      setError('Αποτυχία κατά τη διαγραφή του τίτλου.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-darker border border-primary/40 w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-panel/80 border-b border-gray-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">Live Επεξεργασία UI & Poster</h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                  Admin Editor
                </span>
              </div>
              <p className="text-xs text-gray-400 truncate max-w-xs sm:max-w-md">
                {video.title.replace(/\s*[\(\[]\s*\d{4}\s*[\)\]]\s*$/, "").trim()}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-4 sm:px-6 pt-3 bg-dark/60 border-b border-gray-800/80">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'info'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Βασικά & Περιγραφή</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('images')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'images'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Posters & Artwork</span>
          </button>

          {type === 'series' && (
            <button
              type="button"
              onClick={() => setActiveTab('episodes')}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'episodes'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Επεισόδια ({episodes.length})</span>
            </button>
          )}
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {successToast && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-300 text-xs animate-in fade-in">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Οι αλλαγές αποθηκεύτηκαν επιτυχώς! Ενημέρωση UI...</span>
            </div>
          )}

          {/* TAB 1: General Info & Description */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              
              {/* Title & Year */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-3 space-y-1.5">
                  <label className="text-xs font-bold text-gray-300 flex items-center gap-1">
                    <span>Τίτλος Ταινίας / Σειράς</span>
                    <span className="text-primary">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-dark px-3.5 py-2.5 rounded-xl border border-gray-800 text-sm text-white focus:border-primary focus:outline-none"
                    placeholder="π.χ. Avatar: Ο Τελευταίος Μαχητής του Ανέμου"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300">Έτος</label>
                  <input
                    type="text"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full bg-dark px-3.5 py-2.5 rounded-xl border border-gray-800 text-sm text-white focus:border-primary focus:outline-none"
                    placeholder="2005"
                  />
                </div>
              </div>

              {/* Type & Category Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Type Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300">Τύπος Περιεχομένου</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setType('series')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        type === 'series'
                          ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                          : 'bg-dark border-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      <Tv className="w-4 h-4" />
                      <span>Σειρά</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('movie')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        type === 'movie'
                          ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                          : 'bg-dark border-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      <Film className="w-4 h-4" />
                      <span>Ταινία</span>
                    </button>
                  </div>
                </div>

                {/* Category Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-300">Βιβλιοθήκη Κατηγορίας</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCategory('gctunes')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        category === 'gctunes'
                          ? 'bg-amber-500 text-black border-amber-500 shadow-sm shadow-amber-500/20'
                          : 'bg-dark border-gray-800 text-gray-400 hover:text-amber-300'
                      }`}
                    >
                      <span>🧸</span>
                      <span>Greek Cartoons</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategory('greek_streaming')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        category === 'greek_streaming'
                          ? 'bg-cyan-500 text-black border-cyan-500 shadow-sm shadow-cyan-500/20'
                          : 'bg-dark border-gray-800 text-gray-400 hover:text-cyan-300'
                      }`}
                    >
                      <span>🎬</span>
                      <span>Greek Streaming</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-300">Περιγραφή / Σύνοψη</label>
                  <span className="text-[10px] text-gray-500 font-mono">{description.length} χαρακτήρες</span>
                </div>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-dark p-3.5 rounded-2xl border border-gray-800 text-xs sm:text-sm text-gray-200 focus:border-primary focus:outline-none leading-relaxed resize-y"
                  placeholder="Εισαγάγετε την επίσημη ελληνική περιγραφή..."
                />
              </div>

              {/* Movie Direct Video URL / Storj Key (If type is movie) */}
              {type === 'movie' && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                    <Link className="w-3.5 h-3.5 text-primary" />
                    <span>Σύνδεσμος / Storj Key Αρχείου Βίντεο Ταινίας</span>
                  </label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full bg-dark px-3.5 py-2.5 rounded-xl border border-gray-800 text-xs text-white focus:border-primary focus:outline-none font-mono"
                    placeholder="/api/stream?key=Greek Streaming/Movie.mp4 ή https://..."
                  />
                  <p className="text-[11px] text-gray-500">
                    Υποστηρίζει Storj paths, HLS playlists (.m3u8), MP4 και αυτόματο streaming proxy (/api/stream).
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Images & Posters */}
          {activeTab === 'images' && (
            <div className="space-y-5">
              
              {/* Poster Thumbnail */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-primary" />
                  <span>Poster Thumbnail URL (Κάθετη Αφίσα)</span>
                </label>
                <div className="flex gap-4 items-start">
                  <div className="w-24 aspect-[2/3] bg-dark rounded-2xl overflow-hidden border border-gray-800 shrink-0 shadow-lg relative group">
                    <img
                      src={thumbnail || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop"}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop";
                      }}
                    />
                  </div>

                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={thumbnail}
                      onChange={(e) => setThumbnail(e.target.value)}
                      className="w-full bg-dark px-3.5 py-2.5 rounded-xl border border-gray-800 text-xs text-white focus:border-primary focus:outline-none font-mono"
                      placeholder="https://... ή Storj link εικόνας"
                    />
                    <div className="flex gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setThumbnail("https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?q=80&w=800&auto=format&fit=crop")}
                        className="px-2.5 py-1 bg-dark hover:bg-gray-800 border border-gray-800 rounded-lg text-[10px] text-gray-400 hover:text-white cursor-pointer"
                      >
                        Default Cartoons
                      </button>
                      <button
                        type="button"
                        onClick={() => setThumbnail("https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop")}
                        className="px-2.5 py-1 bg-dark hover:bg-gray-800 border border-gray-800 rounded-lg text-[10px] text-gray-400 hover:text-white cursor-pointer"
                      >
                        Default Cinema
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Backdrop Banner */}
              <div className="space-y-2 pt-2 border-t border-gray-800/80">
                <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  <span>Backdrop Banner URL (Οριζόντιο Banner Φόντου)</span>
                </label>
                
                <div className="w-full aspect-[21/9] max-h-36 bg-dark rounded-2xl overflow-hidden border border-gray-800 shadow-lg relative">
                  <img
                    src={backdrop || thumbnail || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop"}
                    alt="Backdrop Preview"
                    className="w-full h-full object-cover opacity-70"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = thumbnail || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                    <span className="text-[10px] font-bold text-gray-300">Προεπισκόπηση Header Banner</span>
                  </div>
                </div>

                <input
                  type="text"
                  value={backdrop}
                  onChange={(e) => setBackdrop(e.target.value)}
                  className="w-full bg-dark px-3.5 py-2.5 rounded-xl border border-gray-800 text-xs text-white focus:border-primary focus:outline-none font-mono"
                  placeholder="https://... URL οριζόντιας εικόνας banner"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Episodes Management */}
          {activeTab === 'episodes' && type === 'series' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                <div className="text-xs font-black text-white flex items-center gap-2">
                  <Tv className="w-4 h-4 text-primary" />
                  <span>Λίστα Επεισοδίων ({episodes.length})</span>
                </div>

                <button
                  type="button"
                  onClick={handleAddEpisode}
                  className="px-3 py-1.5 rounded-xl bg-primary/20 hover:bg-primary text-primary hover:text-white border border-primary/30 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Προσθήκη Επεισοδίου</span>
                </button>
              </div>

              {episodes.length === 0 ? (
                <div className="py-12 text-center text-gray-500 text-xs bg-dark/50 rounded-2xl border border-dashed border-gray-800">
                  Δεν υπάρχουν ακόμη επεισόδια. Πατήστε <strong>«+ Προσθήκη Επεισοδίου»</strong> για να προσθέσετε.
                </div>
              ) : (
                <div className="space-y-3">
                  {episodes.map((ep, idx) => (
                    <div
                      key={ep.id || idx}
                      className="p-3.5 bg-dark rounded-2xl border border-gray-800 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="w-7 h-7 rounded-lg bg-gray-800 text-primary font-black text-xs flex items-center justify-center shrink-0">
                            #{ep.episodeNumber || idx + 1}
                          </span>
                          <input
                            type="text"
                            value={ep.title}
                            onChange={(e) => handleUpdateEpisode(idx, 'title', e.target.value)}
                            className="flex-1 bg-panel px-3 py-1.5 rounded-lg border border-gray-800 text-xs font-bold text-white focus:border-primary focus:outline-none"
                            placeholder={`Τίτλος Επεισοδίου ${idx + 1}`}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteEpisode(idx)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer shrink-0"
                          title="Διαγραφή Επεισοδίου"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Episode Stream URL / Storj Key */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-gray-400">
                          <span>Σύνδεσμος / Storj Key Βίντεο Επεισοδίου</span>
                        </div>
                        <input
                          type="text"
                          value={ep.url}
                          onChange={(e) => handleUpdateEpisode(idx, 'url', e.target.value)}
                          className="w-full bg-panel px-3 py-1.5 rounded-lg border border-gray-800 text-[11px] text-white focus:border-primary focus:outline-none font-mono"
                          placeholder="/api/stream?key=Gctoons/Avatar/S01E01.mkv ή link..."
                        />
                      </div>

                      {/* Episode Description */}
                      <div>
                        <input
                          type="text"
                          value={ep.description}
                          onChange={(e) => handleUpdateEpisode(idx, 'description', e.target.value)}
                          className="w-full bg-panel px-3 py-1.5 rounded-lg border border-gray-800 text-[11px] text-gray-300 focus:border-primary focus:outline-none"
                          placeholder="Περιγραφή επεισοδίου..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Modal Footer Buttons */}
          <div className="pt-4 border-t border-gray-800 flex items-center justify-between gap-3">
            {onDelete && (
              <button
                type="button"
                onClick={handleDeleteVideo}
                disabled={deleting || saving}
                className="px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? 'Διαγραφή...' : 'Διαγραφή Τίτλου'}</span>
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold transition-all cursor-pointer"
              >
                Ακύρωση
              </button>

              <button
                type="submit"
                disabled={saving || deleting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-orange-500 hover:opacity-90 active:scale-95 text-white font-black text-xs shadow-lg shadow-primary/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{saving ? 'Αποθήκευση...' : 'Αποθήκευση Αλλαγών'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
