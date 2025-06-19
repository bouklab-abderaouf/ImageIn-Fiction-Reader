# AI-Powered PDF Reader

An interactive PDF reader application that allows you to upload PDFs, highlight text, and generate AI images for fiction visualization.

## Features

- **PDF Upload**: Upload and view PDF documents
- **Text Highlighting**: Select and highlight text within PDFs
- **Highlight Management**: View, remove, and manage your highlights
- **AI Image Generation**: Generate images from highlighted text (coming soon)
- **Responsive Design**: Works on desktop and mobile devices

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

3. **Open in Browser**:
   Navigate to `http://localhost:5173` (or the URL shown in your terminal)

## How to Use

1. **Upload a PDF**: Click the "Upload PDF" button and select a PDF file
2. **Navigate Pages**: Use the Previous/Next buttons to navigate through pages
3. **Highlight Text**: Click and drag to select text in the PDF
4. **View Highlights**: Your highlights appear in the sidebar on the right
5. **Generate Images**: Click "Generate Image" on any highlight (AI feature coming soon)
6. **Manage Highlights**: Remove individual highlights or clear all at once

## Technology Stack

- **React 19**: Modern React with hooks
- **Vite**: Fast build tool and development server
- **Tailwind CSS 4**: Utility-first CSS framework
- **React-PDF**: PDF rendering and text extraction
- **PDF.js**: PDF.js for PDF processing

## Development

- **Build**: `npm run build`
- **Preview**: `npm run preview`
- **Lint**: `npm run lint`

## Future Features

- AI-powered image generation from highlighted text
- Multiple AI model support (DALL-E, Midjourney, etc.)
- Highlight export and sharing
- Dark mode support
- PDF annotation tools
- Cloud storage integration

## Contributing

This is a personal project for AI-powered fiction visualization. Feel free to fork and modify for your own needs!
