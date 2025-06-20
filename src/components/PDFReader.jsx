import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { generateImageFromText } from '../utils/stabilityApi';

// Set up PDF.js worker using local file in public directory
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const PDFReader = () => {
  const [file, setFile] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [selectedText, setSelectedText] = useState('');
  const [highlights, setHighlights] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [error, setError] = useState(null);
  const [workerLoaded, setWorkerLoaded] = useState(false);
  const fileInputRef = useRef(null);
  const pdfContainerRef = useRef(null);
  const [popup, setPopup] = useState({ visible: false, x: 0, y: 0 });
  const [pendingSelection, setPendingSelection] = useState('');
  const [pendingRect, setPendingRect] = useState(null);
  const [highlightImages, setHighlightImages] = useState({});
  const [imageLoading, setImageLoading] = useState({});
  const [imageError, setImageError] = useState({});
  const [modalImage, setModalImage] = useState(null);

  // Check if worker is loaded
  useEffect(() => {
    const checkWorker = async () => {
      try {
        // Test if the worker URL is accessible
        const response = await fetch(pdfjs.GlobalWorkerOptions.workerSrc);
        if (response.ok) {
          setWorkerLoaded(true);
          console.log('PDF.js worker loaded successfully');
        } else {
          console.error('PDF.js worker not accessible');
          setError('PDF.js worker not accessible. Please check your internet connection.');
        }
      } catch (err) {
        console.error('Error checking PDF.js worker:', err);
        setError('Failed to load PDF.js worker. Please check your internet connection.');
      }
    };
    
    checkWorker();
  }, []);

  const onFileChange = (event) => {
    const { files } = event.target;
    if (files && files[0]) {
      console.log('File selected:', files[0].name, 'Size:', files[0].size);
      setFile(files[0]);
      setPageNumber(1);
      setHighlights([]);
      setSelectedText('');
      setError(null);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    console.log('PDF loaded successfully with', numPages, 'pages');
    setNumPages(numPages);
    setError(null);
  };

  const onDocumentLoadError = (error) => {
    console.error('Error loading PDF:', error);
    setError(`Failed to load PDF: ${error.message || 'Unknown error'}`);
  };

  const handleMouseDown = () => {
    setIsSelecting(true);
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
    const selection = window.getSelection();
    const text = selection.toString().trim();
    if (text && text.length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      // Get container position
      const containerRect = pdfContainerRef.current.getBoundingClientRect();
      // Position relative to container
      const relX = rect.right - containerRect.left;
      const relY = rect.bottom - containerRect.top;
      setPendingSelection(text);
      setPendingRect({
        x: rect.x - containerRect.left,
        y: rect.y - containerRect.top,
        width: rect.width,
        height: rect.height,
      });
      setPopup({
        visible: true,
        x: relX,
        y: relY,
      });
    } else {
      setPopup({ visible: false, x: 0, y: 0 });
      setPendingSelection('');
      setPendingRect(null);
    }
  };

  const confirmHighlight = () => {
    if (!pendingSelection || !pendingRect) {
      console.warn('No pending selection or rect to confirm:', pendingSelection, pendingRect);
      return;
    }
    const newHighlight = {
      id: Date.now(),
      text: pendingSelection,
      page: pageNumber,
      timestamp: new Date().toISOString(),
      rect: pendingRect,
    };
    setHighlights(prev => [...prev, newHighlight]);
    setSelectedText(pendingSelection);
    setPopup({ visible: false, x: 0, y: 0 });
    setPendingSelection('');
    setPendingRect(null);
    setTimeout(() => {
      window.getSelection().removeAllRanges();
    }, 100);
  };

  const cancelHighlight = () => {
    setPopup({ visible: false, x: 0, y: 0 });
    setPendingSelection('');
    setPendingRect(null);
    setTimeout(() => {
      window.getSelection().removeAllRanges();
    }, 100);
  };

  const removeHighlight = (highlightId) => {
    setHighlights(prev => prev.filter(h => h.id !== highlightId));
  };

  const clearAllHighlights = () => {
    setHighlights([]);
    setSelectedText('');
  };

  const generateImage = async (highlight) => {
    setImageLoading(prev => ({ ...prev, [highlight.id]: true }));
    setImageError(prev => ({ ...prev, [highlight.id]: null }));
    try {
      const img = await generateImageFromText(highlight.text);
      setHighlightImages(prev => ({ ...prev, [highlight.id]: img }));
    } catch (err) {
      setImageError(prev => ({ ...prev, [highlight.id]: err.message }));
    } finally {
      setImageLoading(prev => ({ ...prev, [highlight.id]: false }));
    }
  };

  const retryLoad = () => {
    if (file) {
      setError(null);
      // Force a re-render by temporarily clearing the file
      setFile(null);
      setTimeout(() => setFile(file), 100);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">AI-Powered PDF Reader</h1>
          <p className="text-gray-600 mb-4">
            Upload a PDF, highlight text, and generate AI images for fiction visualization
          </p>
          
          {/* File Upload */}
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={onFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!workerLoaded}
              className={`font-semibold py-2 px-4 rounded-lg transition-colors ${
                workerLoaded 
                  ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                  : 'bg-gray-400 text-gray-600 cursor-not-allowed'
              }`}
            >
              {workerLoaded ? 'Upload PDF' : 'Loading PDF.js...'}
            </button>
            {file && (
              <span className="ml-4 text-gray-600">
                Selected: {file.name}
              </span>
            )}
            {!workerLoaded && (
              <div className="mt-2 text-sm text-orange-600">
                ⚠️ PDF.js worker is loading. Please wait...
              </div>
            )}
          </div>

          {/* Controls */}
          {file && (
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPageNumber(prev => Math.max(1, prev - 1))}
                  disabled={pageNumber <= 1}
                  className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white px-3 py-1 rounded transition-colors"
                >
                  Previous
                </button>
                <span className="text-gray-600">
                  Page {pageNumber} of {numPages || '...'}
                </span>
                <button
                  onClick={() => setPageNumber(prev => Math.min(numPages || 1, prev + 1))}
                  disabled={pageNumber >= (numPages || 1)}
                  className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white px-3 py-1 rounded transition-colors"
                >
                  Next
                </button>
              </div>
              
              <button
                onClick={clearAllHighlights}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition-colors"
              >
                Clear Highlights
              </button>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* PDF Viewer */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              {file ? (
                <div 
                  className="pdf-container"
                  ref={pdfContainerRef}
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseUp}
                  style={{ position: 'relative' }}
                >
                  {/* Popup for confirming highlight */}
                  {popup.visible && (
                    <div
                      className="highlight-popup"
                      style={{ left: popup.x, top: popup.y + 4, padding: '2px 6px', fontSize: '1em', minWidth: 'unset', minHeight: 'unset' }}
                      onMouseDown={e => e.preventDefault()}
                    >
                      <button
                        onClick={confirmHighlight}
                        title="Confirm highlight"
                        style={{ color: '#22c55e', fontSize: '1.1em', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        ✔️
                      </button>
                      <button
                        onClick={cancelHighlight}
                        title="Cancel"
                        style={{ color: '#ef4444', fontSize: '1.1em', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        ❌
                      </button>
                    </div>
                  )}
                  {error && (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <div className="text-red-500 text-6xl mb-4">⚠️</div>
                        <p className="text-red-600 mb-2">Error loading PDF</p>
                        <p className="text-gray-600 text-sm mb-4">{error}</p>
                        <button
                          onClick={retryLoad}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
                        >
                          Try Again
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {!error && (
                    <Document
                      file={file}
                      onLoadSuccess={onDocumentLoadSuccess}
                      onLoadError={onDocumentLoadError}
                      className="flex justify-center"
                    >
                      <Page
                        pageNumber={pageNumber}
                        className="shadow-lg"
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                      />
                    </Document>
                  )}
                  
                  {/* {isSelecting && (
                    <div className="fixed inset-0 pointer-events-none z-50">
                      <div className="absolute inset-0 bg-yellow-200 opacity-20"></div>
                    </div>
                  )} */}
                </div>
              ) : (
                <div className="flex items-center justify-center h-96 border-2 border-dashed border-gray-300 rounded-lg">
                  <div className="text-center">
                    <div className="text-6xl mb-4">📄</div>
                    <p className="text-gray-500">Upload a PDF to get started</p>
                    <p className="text-sm text-gray-400 mt-2">Select text to create highlights</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Highlights and Controls */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 highlights-sidebar max-h-screen overflow-y-auto">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Highlights</h2>
              
              {/* {selectedText && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Selected Text:</p>
                  <p className="text-blue-800 font-medium">"{selectedText}"</p>
                </div>
              )} */}

              {highlights.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No highlights yet. Select text in the PDF to create highlights.
                </p>
              ) : (
                <div className="space-y-4">
                  {highlights
                    .filter(h => h.page === pageNumber)
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                    .map((highlight) => (
                      <div
                        key={highlight.id}
                        className="bg-white rounded-xl shadow hover:shadow-lg transition-shadow p-4 flex flex-col gap-2 border border-gray-100"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-400">
                            Page {highlight.page} • {new Date(highlight.timestamp).toLocaleTimeString()}
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => generateImage(highlight)}
                              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${imageLoading[highlight.id] ? 'bg-green-300 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                              disabled={imageLoading[highlight.id]}
                              title="Generate Image"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                              {imageLoading[highlight.id] ? 'Generating...' : 'Image'}
                            </button>
                            <button
                              onClick={() => removeHighlight(highlight.id)}
                              className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                              title="Remove Highlight"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="text-gray-800 text-sm leading-relaxed whitespace-pre-line mb-2">{highlight.text}</div>
                        <hr className="my-2 border-gray-200" />
                        {imageError[highlight.id] && (
                          <div className="text-xs text-red-500 mb-1">{imageError[highlight.id]}</div>
                        )}
                        {highlightImages[highlight.id] && (
                          <div className="relative group">
                            <img
                              src={highlightImages[highlight.id]}
                              alt={`Generated for: ${highlight.text}`}
                              className="w-full rounded-lg shadow-md cursor-pointer transition-transform duration-200 group-hover:scale-105"
                              style={{ maxHeight: 180, objectFit: 'contain' }}
                              title="Click to enlarge"
                              onClick={() => setModalImage({ src: highlightImages[highlight.id], alt: highlight.text })}
                            />
                            <button
                              className="absolute bottom-2 right-2 bg-white bg-opacity-90 rounded-full p-1 shadow hover:scale-110 transition-transform"
                              title="Download image"
                              onClick={() => {
                                const a = document.createElement('a');
                                a.href = highlightImages[highlight.id];
                                a.download = `ai-image-${highlight.id}.png`;
                                a.click();
                              }}
                              style={{ zIndex: 2 }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" /></svg>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {modalImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70" onClick={() => setModalImage(null)}>
          <div className="bg-white rounded-lg shadow-lg p-4 max-w-full max-h-full flex flex-col items-center relative" onClick={e => e.stopPropagation()}>
            <button
              className="absolute top-2 right-2 text-gray-600 hover:text-red-500 text-2xl font-bold"
              onClick={() => setModalImage(null)}
              title="Close"
            >
              &times;
            </button>
            <img
              src={modalImage.src}
              alt={modalImage.alt}
              className="max-w-[90vw] max-h-[80vh] rounded border border-gray-300"
              style={{ objectFit: 'contain' }}
            />
            <div className="mt-2 text-gray-700 text-center text-sm max-w-lg">{modalImage.alt}</div>
            <button
              className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              onClick={() => {
                const a = document.createElement('a');
                a.href = modalImage.src;
                a.download = 'ai-image-full.png';
                a.click();
              }}
            >
              Download Image
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFReader; 