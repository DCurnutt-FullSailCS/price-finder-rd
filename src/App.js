import { useState, useEffect } from "react";
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

  // Current sort option: "none" (source order) or "priceAsc"/"priceDesc"
  const [sortBy, setSortBy] = useState("none");

  // Active source filter: "all" | "local" | "online"
  const [sourceFilter, setSourceFilter] = useState("all");

  // Saved favorite items (full result objects), so they display in the
  // Favorites view regardless of the current search. Initialized from
  // localStorage so favorites persist across page refreshes and visits.
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem("highscore_favorites");
      return saved ? JSON.parse(saved) : [];
    } catch (err) {
      console.error("Could not read saved favorites:", err);
      return [];
    }
  });

  // Save favorites to localStorage whenever they change, so they survive
  // a refresh or browser restart.
  useEffect(() => {
    try {
      localStorage.setItem("highscore_favorites", JSON.stringify(favorites));
    } catch (err) {
      console.error("Could not save favorites:", err);
    }
  }, [favorites]);

  // The last few searches the user has run (most recent first)
  const [recentSearches, setRecentSearches] = useState([]);

  // Whether the recent-searches dropdown is visible
  const [showRecent, setShowRecent] = useState(false);

  // Light/dark theme toggle (in-session)
  const [darkMode, setDarkMode] = useState(false);

  // The result currently shown in the details modal (null = closed)
  const [selectedItem, setSelectedItem] = useState(null);

  // Close the details modal when the user presses Escape.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setSelectedItem(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Sync the theme to the <body> so the dark background fills the whole
  // page, not just the centered app column.
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
    return () => document.body.classList.remove("dark-mode");
  }, [darkMode]);

  // ---------------------------------------------------------
  // PRICE HELPER
  // Pulls a numeric price out of either result shape. Local items
  // store price as a number; CheapShark stores "cheapest" as a
  // string, so both are normalized to a Number for sorting.
  // ---------------------------------------------------------
  const getPrice = (item) => {
    const raw = "retailer" in item ? item.price : item.cheapest;
    return parseFloat(raw);
  };

  // ---------------------------------------------------------
  // FAVORITE HELPERS
  // The two data sources don't share a common id: local consoles have
  // a "name", CheapShark results have a "gameID". itemKey builds one
  // stable key that works for either shape so favorites can be tracked.
  // ---------------------------------------------------------
  const itemKey = (item) => {
    return "retailer" in item ? `local-${item.name}` : `online-${item.gameID}`;
  };

  const isFavorite = (item) =>
    favorites.some(fav => itemKey(fav) === itemKey(item));

  const toggleFavorite = (item) => {
    const key = itemKey(item);
    setFavorites(prev =>
      prev.some(fav => itemKey(fav) === key)
        ? prev.filter(fav => itemKey(fav) !== key)   // remove
        : [...prev, item]                            // save the whole item
    );
  };

  // ---------------------------------------------------------
  // RECENT SEARCHES
  // Adds a term to the top of the recent list, removes any duplicate
  // of that term, and caps the list at five entries.
  // ---------------------------------------------------------
  const addRecentSearch = (term) => {
    setRecentSearches(prev => {
      const withoutDupe = prev.filter(t => t !== term);
      return [term, ...withoutDupe].slice(0, 5);
    });
  };

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
  // Returns online game deals matching the query. Guards against a
  // non-array response so a bad payload can never crash the results
  // list. Returns an empty array on any unexpected shape.
  // ---------------------------------------------------------
  const searchOnline = async (term) => {
    const response = await fetch(
      `https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(term)}`
    );

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  };

  // ---------------------------------------------------------
  // UNIFIED SEARCH
  // Runs the local console lookup and the online game lookup at the
  // same time, then merges both into a single results list so the
  // user sees everything from one search. Accepts an optional term
  // so a recent-search click can search directly.
  // ---------------------------------------------------------
  const handleSearch = async (searchTerm) => {
    // Use the passed term (from a recent-search click) or the input box.
    const rawTerm = searchTerm !== undefined ? searchTerm : query;
    const term = rawTerm.trim().toLowerCase();
    if (!term) return; // ignore empty searches

    // Keep the input in sync when searching from a recent item.
    setQuery(rawTerm);
    setShowRecent(false);

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

    // Record this search so it appears in the recent dropdown.
    addRecentSearch(term);
  };

  // Allow pressing Enter in the input to search.
  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  // Clicking a recent search runs it immediately.
  const handleRecentClick = (term) => {
    handleSearch(term);
  };

  // ---------------------------------------------------------
  // SORTED VIEW
  // Sorting is applied at render time from the current sortBy value,
  // so changing the sort never re-runs the search. A copy is sorted
  // so the original merged order is preserved for "none".
  // ---------------------------------------------------------
  // Merged results in their natural (relevance) order; sorting is applied
  // later to whichever list is actually shown.
  const sortedResults = results;

  // ---------------------------------------------------------
  // FILTERED VIEW
  // Narrows the sorted results by source. Local console entries have a
  // "retailer" field; online (CheapShark) results do not. Filtering is
  // applied at render time so it never re-runs the search.
  // ---------------------------------------------------------
  // For the Favorites view we render the saved items directly, so favorites
  // from earlier searches still show. Other views filter the current results.
  let baseList;
  if (sourceFilter === "favorites") {
    baseList = favorites;
  } else if (sourceFilter === "local") {
    baseList = sortedResults.filter(item => "retailer" in item);
  } else if (sourceFilter === "online") {
    baseList = sortedResults.filter(item => !("retailer" in item));
  } else {
    baseList = sortedResults;
  }

  // Apply the current price sort to whatever list is being shown.
  const visibleResults = [...baseList];
  if (sortBy === "priceAsc") {
    visibleResults.sort((a, b) => getPrice(a) - getPrice(b));
  } else if (sortBy === "priceDesc") {
    visibleResults.sort((a, b) => getPrice(b) - getPrice(a));
  }

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------
  return (
    <div className={`app ${darkMode ? "dark" : ""}`}>
      <button
        className="theme-toggle"
        onClick={() => setDarkMode(prev => !prev)}
        aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      >
        {darkMode ? "\u2600\uFE0F Light" : "\uD83C\uDF19 Dark"}
      </button>

      <h1 className="app-title">High Score</h1>
      <p className="app-subtitle">
        Compare console and game prices &mdash; lowest price wins.
      </p>

      {/* Search bar */}
      <div className="search-bar">
        <div className="search-input-wrap">
          <input
            type="text"
            className="search-input"
            placeholder="Search for a console or game..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowRecent(true)}
            // Delay hiding so a click on a dropdown item registers first.
            onBlur={() => setTimeout(() => setShowRecent(false), 150)}
            disabled={loading}
          />

          {/* Recent searches dropdown */}
          {showRecent && recentSearches.length > 0 && (
            <ul className="recent-dropdown">
              <li className="recent-label">Recent searches</li>
              {recentSearches.map((term, index) => (
                <li
                  key={index}
                  className="recent-item"
                  // onMouseDown fires before onBlur, so the click isn't lost.
                  onMouseDown={() => handleRecentClick(term)}
                >
                  {term}
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          className="search-button"
          onClick={() => handleSearch()}
          disabled={loading}
        >
          {loading ? "Searching..." : "Search"}
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
        <p className="status-message">
          No results found. Try a different console or game title.
        </p>
      )}

      {/* Results header row: count, source filter toggles, and sort control */}
      {results.length > 0 && (
        <div className="results-toolbar">
          <h3 className="results-header">
            Results ({visibleResults.length}):
          </h3>

          {/* Source filter toggle buttons */}
          <div className="filter-group" role="group" aria-label="Filter by source">
            <button
              className={`filter-button ${sourceFilter === "all" ? "active" : ""}`}
              onClick={() => setSourceFilter("all")}
            >
              All
            </button>
            <button
              className={`filter-button ${sourceFilter === "local" ? "active" : ""}`}
              onClick={() => setSourceFilter("local")}
            >
              In-Store
            </button>
            <button
              className={`filter-button ${sourceFilter === "online" ? "active" : ""}`}
              onClick={() => setSourceFilter("online")}
            >
              Online
            </button>
            <button
              className={`filter-button ${sourceFilter === "favorites" ? "active" : ""}`}
              onClick={() => setSourceFilter("favorites")}
            >
              &#9733; Favorites ({favorites.length})
            </button>
          </div>

          <label className="sort-control">
            Sort by:{" "}
            <select
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="none">Relevance</option>
              <option value="priceAsc">Price: Low to High</option>
              <option value="priceDesc">Price: High to Low</option>
            </select>
          </label>
        </div>
      )}

      {/* Empty state for the Favorites view */}
      {sourceFilter === "favorites" && favorites.length === 0 && (
        <p className="status-message">
          No favorites yet &mdash; tap the star on any result to save it.
        </p>
      )}

      {/* Message when a source filter hides all results */}
      {results.length > 0 && visibleResults.length === 0 && sourceFilter !== "favorites" && (
        <p className="status-message">
          No {sourceFilter === "local" ? "in-store" : "online"} results for this search.
        </p>
      )}

      {/* Results grid of cards */}
      <div className="results-grid">
        {visibleResults.map((item, index) => (
          <div key={index} className="result-card">
            <button
              className={`favorite-star ${isFavorite(item) ? "saved" : ""}`}
              onClick={() => toggleFavorite(item)}
              aria-label={isFavorite(item) ? "Remove from favorites" : "Add to favorites"}
              title={isFavorite(item) ? "Remove from favorites" : "Add to favorites"}
            >
              {isFavorite(item) ? "\u2605" : "\u2606"}
            </button>
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
            <button
              className="details-button"
              onClick={() => setSelectedItem(item)}
            >
              View Details
            </button>
          </div>
        ))}
      </div>

      {/* Item details modal */}
      {selectedItem && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setSelectedItem(null)}
              aria-label="Close details"
            >
              &times;
            </button>

            {"retailer" in selectedItem ? (
              /* In-store console details */
              <>
                <span className="source-tag source-local">In-Store</span>
                <h2 className="modal-title">{selectedItem.name}</h2>
                <p className="modal-row"><strong>Retailer:</strong> {selectedItem.retailer}</p>
                <p className="modal-row"><strong>Price:</strong> ${selectedItem.price}</p>
                <p className="modal-row modal-note">
                  In-store price from our console price list.
                </p>
              </>
            ) : (
              /* Online game deal details */
              <>
                <span className="source-tag source-online">Online Deal</span>
                <h2 className="modal-title">{selectedItem.external}</h2>
                <p className="modal-row"><strong>Best online price:</strong> ${selectedItem.cheapest}</p>
                <p className="modal-row modal-note">
                  Live deal data from the CheapShark API.
                </p>
                {selectedItem.gameID && (
                  <a
                    className="modal-link"
                    href={`https://www.cheapshark.com/redirect?dealID=${selectedItem.cheapestDealID}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Deal
                  </a>
                )}
              </>
            )}

            <button
              className={`modal-fav ${isFavorite(selectedItem) ? "saved" : ""}`}
              onClick={() => toggleFavorite(selectedItem)}
            >
              {isFavorite(selectedItem) ? "\u2605 Saved to Favorites" : "\u2606 Add to Favorites"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;