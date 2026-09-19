import requests
import json
import re
from datetime import datetime, timezone

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36"
}

def fetch_indian_indices():
    try:
        response = requests.get("https://www.livemint.com/market/india-indices", headers=HEADERS, timeout=20)
        response.raise_for_status()
        text = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", response.text))
        
        results = {}
        sensex_match = re.search(r"SENSEX\s+([\d,]+\.\d+)\s+([+-]?[\d,]+\.\d+)\s+([+-]?\d+\.\d+)", text, re.IGNORECASE)
        if sensex_match:
            results["sensex"] = {
                "price": float(sensex_match.group(1).replace(",", "")),
                "change": float(sensex_match.group(2).replace(",", "")),
                "change_percent": float(sensex_match.group(3))
            }
            
        nifty_match = re.search(r"NIFTY\s+50\s+([\d,]+\.\d+)\s+([+-]?[\d,]+\.\d+)\s+([+-]?\d+\.\d+)", text, re.IGNORECASE)
        if nifty_match:
            results["nifty50"] = {
                "price": float(nifty_match.group(1).replace(",", "")),
                "change": float(nifty_match.group(2).replace(",", "")),
                "change_percent": float(nifty_match.group(3))
            }
        return {"source": "LiveMint", "updated_at": datetime.now(timezone.utc).isoformat(), "indices": results}
    except Exception as e:
        print(f"Error fetching Indian indices: {e}")
        return None

def fetch_us_indices():
    base_url = "https://api-mintgenie.livemint.com/mintgenie-vendor/index/live-price"
    symbols = {"NAS100": "NASDAQ 100", "SPX500": "S&P 500"}
    indices = {}
    
    for symbol, name in symbols.items():
        try:
            res = requests.get(f"{base_url}/{symbol}", headers=HEADERS, timeout=15)
            res.raise_for_status()
            data = res.json()
            indices[symbol] = {
                "name": data.get("instrumentName", name),
                "price": data.get("mid"),
                "change": data.get("netChange"),
                "change_percent": data.get("changePercent"),
                "market_time": data.get("requestedTime")
            }
        except Exception as e:
            print(f"Failed to fetch {symbol}: {e}")
    return {"source": "LiveMint", "source_url": "https://livemint.com", "updated_at": datetime.now(timezone.utc).isoformat(), "indices": indices}

if __name__ == "__main__":
    # Save Indian indices
    india_data = fetch_indian_indices()
    if india_data:
        with open("indian_indices.json", "w", encoding="utf-8") as f:
            json.dump(india_data, f, indent=4)
            
    # Save US indices
    us_data = fetch_us_indices()
    if us_data:
        with open("us_indices.json", "w", encoding="utf-8") as f:
            json.dump(us_data, f, indent=4)
