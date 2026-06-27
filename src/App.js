import { useState } from "react";
import consoleData from "./consoleData.json";

function App() {
  // User's search input
  const [query, setQuery] = useState("");

  // Results from either local JSON or CheapShark API
  const [results, setResults] = useState([]);

  // Loading state for online search
  const [loading, setLoading] = useState(false);

  // Error message for API failures
  const [error, setError] = useState(null);

  // ---------------------------------------------------------
  // LOCAL JSON SEARCH
  // ---------------------------------------------------------
  const handleSearch = () => {
    setError(null); // Clear any previous errors

    const filtered = consoleData.filter(item =>
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.aliases.some(alias =>
        alias.toLowerCase().includes(query.toLowerCase())
      )
    );

    setResults(filtered);
  };

  // ---------------------------------------------------------
  // CHEAPSHARK API SEARCH
  // ---------------------------------------------------------
  const searchCheapShark = async () => {
    if (!query) return;

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch(
        `https://www.cheapshark.com/api/1.0/games?title=${query}`
      );

      const data = await response.json();
      setResults(data);
    } catch (err) {
      console.error("API Error:", err);
      setError("Something went wrong while searching online deals.");
    }

    setLoading(false);
  };

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------
  return (
    <div style={{ padding: "20px" }}>
      <h1>Local Game & Console Price Finder (R&D)</h1>

      {/* Search Input */}
      <input
        type="text"
        placeholder="Search for a console or game..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ padding: "8px", width: "250px", marginRight: "10px" }}
      />

      {/* Local Search Button */}
      <button onClick={handleSearch} style={{ padding: "8px 12px" }}>
        Search Local
      </button>

      {/* Online Search Button */}
      <button
        onClick={searchCheapShark}
        style={{ padding: "8px 12px", marginLeft: "10px" }}
      >
        Search Online Deals
      </button>

      {/* Loading Message */}
      {loading && (
        <p style={{ marginTop: "20px", fontStyle: "italic" }}>
          Searching online deals...
        </p>
      )}

      {/* Error Message */}
      {error && (
        <p style={{ color: "red", marginTop: "20px" }}>
          {error}
        </p>
      )}

      {/* No Results Message */}
      {!loading && results.length === 0 && query && !error && (
        <p style={{ marginTop: "20px", fontStyle: "italic" }}>
          No results found.
        </p>
      )}

      {/* Results Header */}
      {results.length > 0 && (
        <h3 style={{ marginTop: "20px" }}>Results:</h3>
      )}

      {/* Results List */}
      <div style={{ marginTop: "10px" }}>
        {results.map((item, index) => (
          <div
            key={index}
            style={{
              marginBottom: "10px",
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              maxWidth: "350px"
            }}
          >
            {/* Local JSON result */}
            {"retailer" in item ? (
              <>
                <strong>{item.name}</strong> — {item.retailer} — ${item.price}
              </>
            ) : (
              /* CheapShark API result */
              <>
                <strong>{item.external}</strong> — Cheapest: ${item.cheapest}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;