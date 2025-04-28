import { searchHighlight } from "@/editor/plugins/searchHighlightPlugin";

export const navigateToText = (text: string) => {
  // Get the editor element
  const editorEl = document.querySelector('[data-slate-editor="true"]') as HTMLElement;
  
  if (!editorEl || !text) {
    return;
  }
  
  // Clear any existing highlights first
  searchHighlight.clear(editorEl);
  
  // Try exact match first
  const { matchCount, matches } = searchHighlight.highlight(editorEl, text, false);
  
  // If matches were found, highlight the first one
  if (matchCount > 0 && matches.length > 0) {
    searchHighlight.highlightCurrent(matches[0]);
    return;
  }
  
  // If no exact match, try to find the best matching substring
  const findBestMatch = () => {
    // Get all text content from the editor
    const editorText = editorEl.textContent || "";
    
    // Clean up the source text (remove extra spaces)
    const cleanSource = text.replace(/\s+/g, ' ').trim();
    const cleanEditor = editorText.replace(/\s+/g, ' ').trim();
    
    // Extract significant phrases (5+ words) from the source text
    const phrases = cleanSource
      .split(/[.!?;]/)
      .map(phrase => phrase.trim())
      .filter(phrase => phrase.length > 20);
    
    // Try each significant phrase
    for (const phrase of phrases) {
      const { matchCount, matches } = searchHighlight.highlight(editorEl, phrase, false);
      
      if (matchCount > 0 && matches.length > 0) {
        searchHighlight.highlightCurrent(matches[0]);
        return true;
      }
      searchHighlight.clear(editorEl);
    }
    
    // If no phrase matches, try individual words
    const sourceWords = cleanSource.split(/\s+/).filter(word => word.length > 5);
    const editorWords = cleanEditor.split(/\s+/);
    
    // Find the most unique words from the source
    const uniqueWords = sourceWords
      .filter(word => word.length > 5)
      .sort((a, b) => {
        // Count occurrences in editor text
        const aCount = editorWords.filter(w => w.toLowerCase() === a.toLowerCase()).length;
        const bCount = editorWords.filter(w => w.toLowerCase() === b.toLowerCase()).length;
        // Prefer words that appear less frequently (more unique)
        return aCount - bCount;
      })
      .slice(0, 5); // Take top 5 most unique words
    
    // Try to find a section with multiple unique words close together
    let bestSection = "";
    let bestMatchCount = 0;
    
    for (let i = 0; i < editorWords.length - 15; i++) {
      const section = editorWords.slice(i, i + 15).join(' ');
      let matchCount = 0;
      
      for (const word of uniqueWords) {
        if (section.toLowerCase().includes(word.toLowerCase())) {
          matchCount++;
        }
      }
      
      if (matchCount > bestMatchCount) {
        bestMatchCount = matchCount;
        bestSection = section;
      }
      
      if (matchCount >= 2) { // If at least 2 unique words are found close together
        const { matchCount: highlightCount, matches } = searchHighlight.highlight(editorEl, section, false);
        
        if (highlightCount > 0 && matches.length > 0) {
          searchHighlight.highlightCurrent(matches[0]);
          return true;
        }
        
        searchHighlight.clear(editorEl);

      }
    }
    
    // If we found a best section but couldn't highlight it yet, try to highlight individual key terms
    if (bestMatchCount > 0) {
      // Extract key terms from the source text
      const keyTerms = cleanSource
        .split(/[,;:]/)
        .map(term => term.trim())
        .filter(term => term.length > 3);
      
      // Find which key terms appear in the best section
      const matchingTerms = keyTerms.filter(term => 
        bestSection.toLowerCase().includes(term.toLowerCase())
      );
      
      // Try to highlight each matching term
      let highlightedAny = false;
      
      for (const term of matchingTerms) {
        if (term.length < 5) continue; // Skip very short terms
        
        const { matchCount, matches } = searchHighlight.highlight(editorEl, term, false);
        
        if (matchCount > 0 && matches.length > 0) {
          // If this is the first term we've highlighted, scroll to it
          if (!highlightedAny) {
            searchHighlight.highlightCurrent(matches[0]);
            highlightedAny = true;
          }
        }
      }
      
      return highlightedAny;
    }
    
    return false;
  };
  
  // Try to find the best match
  findBestMatch();
};