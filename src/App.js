import { useState } from "react";
import consoleData from "./consoleData.json";

function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false); 

  // Local JSON search
  const handleSearch = () => {
    const filtered = consoleData.filter(item =>
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.aliases.some(alias =>
        alias.toLowerCase().includes(query.toLowerCase())
      )
    );
    setResults(filtered);
  };

  // CheapShark API search 
  const searchCheapShark = async () => {
    if (!query) return;

    setLoading(true);     
    setResults([]);       

    try {
      const response = await fetch(
        `https://www.cheapshark.com/api/1.0/games?title=${query}`
      );
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error("API Error:", error);
    }

    setLoading(false);    
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Local Game & Console Price Finder (R&D)</h1>

      <input
        type="text"
        placeholder="Search for a console or game..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ padding: "8px", width: "250px", marginRight: "10px" }}
      />

      <button onClick={handleSearch} style={{ padding: "8px 12px" }}>
        Search Local
      </button>

      <button
        onClick={searchCheapShark}
        style={{ padding: "8px 12px", marginLeft: "10px" }}
      >
        Search Online Deals
      </button>

      {/* NEW LOADING MESSAGE */}
      {loading && (
        <p style={{ marginTop: "20px", fontStyle: "italic" }}>
          Searching online deals...
        </p>
      )}

      <div style={{ marginTop: "20px" }}>
        {results.map((item, index) => (
          <div key={index} style={{ marginBottom: "10px" }}>
            {"retailer" in item ? (
              <>
                <strong>{item.name}</strong> — {item.retailer} — ${item.price}
              </>
            ) : (
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
