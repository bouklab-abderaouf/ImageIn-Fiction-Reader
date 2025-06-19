import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

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

  const generateImage = (highlight) => {
    // This will be implemented later with AI image generation
    console.log('Generating image for:', highlight.text);
    alert(`Image generation for: "${highlight.text}" - This feature will be implemented with AI!`);
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
                <div className="space-y-3">
                  {highlights
                    .filter(h => h.page === pageNumber)
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                    .map((highlight) => (
                      <div
                        key={highlight.id}
                        className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors"
                      >
                        <p className="text-sm text-gray-600 mb-1">
                          Page {highlight.page} • {new Date(highlight.timestamp).toLocaleTimeString()}
                        </p>
                        <p className="text-gray-800 mb-2">"{highlight.text}"</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => generateImage(highlight)}
                            className="bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-1 rounded transition-colors"
                          >
                            Generate Image
                          </button>
                          <button
                            onClick={() => removeHighlight(highlight.id)}
                            className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFReader; 