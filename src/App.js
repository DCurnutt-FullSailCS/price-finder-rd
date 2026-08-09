import { useState } from "react";
import consoleData from "./consoleData.json";
import "./App.css";

function App() {
  // User's search input
  const [query, setQuery] = useState("");

  // Combined results from BOTH the local JSON and the CheapShark API
  const [results, setResults] = useState([]);

  // Loading state while the online search is in progress
  const [loading, setLoading] = useState(false);

  // Error message for API failures
  const [error, setError] = useState(null);

  // Tracks whether a search has been run yet (controls "no results" message)
  const [searched, setSearched] = useState(false);

  // ---------------------------------------------------------
  // LOCAL JSON SEARCH
  // Returns the console entries whose name or alias matches the query.
  // ---------------------------------------------------------
  const searchLocal = (term) => {
    return consoleData.filter(item =>
      item.name.toLowerCase().includes(term) ||
      item.aliases.some(alias => alias.toLowerCase().includes(term))
    );
  };

  // ---------------------------------------------------------
  // CHEAPSHARK API SEARCH
  // Returns online game deals matching the query, or an empty
  // array if the request fails.
  // ---------------------------------------------------------
  const searchOnline = async (term) => {
    const response = await fetch(
      `https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(term)}`
    );
    return await response.json();
  };

  // ---------------------------------------------------------
  // UNIFIED SEARCH
  // Runs the local console lookup and the online game lookup at the
  // same time, then merges both into a single results list so the
  // user sees everything from one search.
  // ---------------------------------------------------------
  const handleSearch = async () => {
    const term = query.trim().toLowerCase();
    if (!term) return; // ignore empty searches

    setLoading(true);
    setError(null);
    setResults([]);
    setSearched(true);

    // Local search is instant and can't fail.
    const localResults = searchLocal(term);

    // Online search can fail, so guard it. If it errors, we still
    // show the local results and report the online failure.
    let onlineResults = [];
    try {
      onlineResults = await searchOnline(term);
    } catch (err) {
      console.error("API Error:", err);
      setError("Online deals couldn't be loaded, showing local results only.");
    }

    // Merge: local console entries first, then online game deals.
    setResults([...localResults, ...onlineResults]);
    setLoading(false);
  };

  // Allow pressing Enter in the input to search.
  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------
  return (
    <div className="app">
      <h1 className="app-title">High Score</h1>
      <p className="app-subtitle">
        Compare console and game prices &mdash; lowest price wins.
      </p>

      {/* Search bar */}
      <div className="search-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search for a console or game..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="search-button" onClick={handleSearch}>
          Search
        </button>
      </div>

      {/* Loading Message */}
      {loading && (
        <p className="status-message">Searching for prices...</p>
      )}

      {/* Error Message (online failed, local still shown) */}
      {error && (
        <p className="error-message">{error}</p>
      )}

      {/* No Results Message */}
      {!loading && searched && results.length === 0 && !error && (
        <p className="status-message">No results found.</p>
      )}

      {/* Results Header */}
      {results.length > 0 && (
        <h3 className="results-header">Results:</h3>
      )}

      {/* Results grid of cards */}
      <div className="results-grid">
        {results.map((item, index) => (
          <div key={index} className="result-card">
            {"retailer" in item ? (
              /* Local JSON result (has a "retailer" field) */
              <>
                <span className="source-tag source-local">In-Store</span>
                <div className="result-name">{item.name}</div>
                <div className="result-detail">Retailer: {item.retailer}</div>
                <div className="result-price">${item.price}</div>
              </>
            ) : (
              /* CheapShark API result (has "external" and "cheapest") */
              <>
                <span className="source-tag source-online">Online Deal</span>
                <div className="result-name">{item.external}</div>
                <div className="result-detail">Best online price</div>
                <div className="result-price">${item.cheapest}</div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;