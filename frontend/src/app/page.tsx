"use client";

import { useEffect, useState } from "react";
import { Recycle } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import styles from "./page.module.css";

// Constants
const API_URL = "http://127.0.0.1:8000";

const ITEM_COLORS: Record<string, string> = {
  cardboard: "#f59e0b", // warning (orange)
  glass: "#0ea5e9",     // sky blue
  metal: "#64748b",     // slate gray
  paper: "#3b82f6",     // primary (blue)
  plastic: "#10b981",   // success (green)
  trash: "#ef4444",     // danger (red)
};

const ITEM_CLASSES: Record<string, string> = {
  cardboard: styles.itemCardboard,
  glass: styles.itemGlass,
  metal: styles.itemMetal,
  paper: styles.itemPaper,
  plastic: styles.itemPlastic,
  trash: styles.itemTrash,
};

// Types
interface Stats {
  total_processed: number;
  items: Record<string, number>;
}

interface Detection {
  id: number;
  predicted_item: string;
  confidence: number;
  category: string;
  timestamp: string;
  image_path: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentDetections, setRecentDetections] = useState<Detection[]>([]);
  const [currentTime, setCurrentTime] = useState<string>("");

  const fetchData = async () => {
    try {
      const statsRes = await fetch(`${API_URL}/statistics`);
      if (statsRes.ok) setStats(await statsRes.json());

      const detRes = await fetch(`${API_URL}/detections?limit=12`);
      if (detRes.ok) setRecentDetections(await detRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!stats) return <div className={styles.container}>Loading dashboard...</div>;

  // Prepare data for pie and bar charts
  const itemsData = Object.entries(stats.items).map(([name, value]) => ({
    name,
    value,
  }));

  // Prepare data for line chart (cumulative detections over time from recent)
  // Reversing so oldest is left, newest is right
  const trendData = [...recentDetections].reverse().map((d, index) => ({
    index: index + 1,
    confidence: Math.round(d.confidence * 100),
  }));

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.titleContainer}>
          <Recycle size={32} className={styles.logo} />
          <div>
            <h1 className={styles.title}>Smart Waste Segregation Dashboard</h1>
            <p className={styles.subtitle}>Real-time monitoring of the sorting robot</p>
          </div>
        </div>
        <div className={styles.statusContainer}>
          <div className={styles.status}>
            <div className={styles.statusDot} />
            System Online
          </div>
          <div style={{ color: "var(--secondary)" }}>{currentTime}</div>
        </div>
      </header>

      {/* Metric Cards */}
      <div className={styles.grid}>
        <div className={`${styles.card} glass-card`}>
          <h2 className={styles.cardTitle}>Total Processed</h2>
          <div className={styles.cardValue}>{stats.total_processed}</div>
        </div>
        
        {Object.entries(stats.items).map(([item, count]) => (
          <div key={item} className={`${styles.card} glass-card ${ITEM_CLASSES[item] || ""}`}>
            <h2 className={styles.cardTitle} style={{ textTransform: "capitalize" }}>{item}</h2>
            <div className={styles.cardValue}>{count}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--secondary)", marginTop: "0.5rem" }}>
              {stats.total_processed > 0 ? Math.round((count / stats.total_processed) * 100) : 0}% of total
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className={styles.chartsGrid}>
        <div className={`${styles.chartCard} glass-card`}>
          <h2 className={styles.chartTitle}>Waste Distribution</h2>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={itemsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {itemsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={ITEM_COLORS[entry.name] || "var(--primary)"} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "var(--shadow-md)" }}
                  itemStyle={{ color: "var(--foreground)", textTransform: "capitalize" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap", marginTop: "1rem" }}>
            {itemsData.map((entry) => (
              <div key={entry.name} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "var(--secondary)", textTransform: "capitalize" }}>
                <div style={{ width: "12px", height: "4px", backgroundColor: ITEM_COLORS[entry.name] || "var(--primary)" }} />
                {entry.name}
              </div>
            ))}
          </div>
        </div>

        <div className={`${styles.chartCard} glass-card`}>
          <h2 className={styles.chartTitle}>Items by Type</h2>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={itemsData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--secondary)" }} style={{ textTransform: "capitalize" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--secondary)" }} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "rgba(0,0,0,0.02)" }}
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "var(--shadow-md)" }}
                  itemStyle={{ textTransform: "capitalize" }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {itemsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={ITEM_COLORS[entry.name] || "var(--primary)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detection Trend */}
      <div className={`${styles.fullWidthCard} glass-card`}>
        <h2 className={styles.chartTitle}>Detection Confidence Trend (last 12 events)</h2>
        <div style={{ height: "250px", width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
              <XAxis dataKey="index" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--secondary)" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--secondary)" }} domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "var(--shadow-md)" }}
                formatter={(value: number) => [`${value}%`, 'Confidence']}
              />
              <Line 
                type="monotone" 
                dataKey="confidence" 
                stroke="var(--primary)" 
                strokeWidth={3}
                dot={{ r: 4, fill: "var(--primary)", strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "var(--primary)", stroke: "var(--card-bg)", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Detections Table */}
      <div className={`${styles.fullWidthCard} glass-card`}>
        <h2 className={styles.chartTitle}>Recent Detections</h2>
        <div style={{ overflowX: "auto" }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Item Detected</th>
                <th>Category</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {recentDetections.map((detection) => (
                <tr key={detection.id}>
                  <td>
                    {new Date(detection.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td>
                    <span className="badge" style={{ 
                      backgroundColor: `${ITEM_COLORS[detection.predicted_item]}20`, 
                      color: ITEM_COLORS[detection.predicted_item],
                      textTransform: "capitalize"
                    }}>
                      {detection.predicted_item}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${detection.category === "Recyclable" ? "badge-primary" : "badge-danger"}`}>
                      {detection.category}
                    </span>
                  </td>
                  <td>
                    {Math.round(detection.confidence * 100)}%
                  </td>
                </tr>
              ))}
              {recentDetections.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "var(--secondary)", padding: "2rem" }}>
                    No detections yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
