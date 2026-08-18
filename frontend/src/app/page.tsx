"use client";

import { useEffect, useState, useRef, ChangeEvent, DragEvent } from "react";
import { 
  Recycle, 
  Upload, 
  ImageIcon, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X,
  Scan,
  Activity
} from "lucide-react";
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
import { runClientInference, ClientPredictionResult } from "@/utils/onnxInference";
import { 
  getStoredDetections, 
  addDetection, 
  calculateStats, 
  Detection, 
  Stats 
} from "@/utils/storage";

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

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentDetections, setRecentDetections] = useState<Detection[]>([]);
  const [currentTime, setCurrentTime] = useState<string>("");

  // Upload & Inspection States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [predictionResult, setPredictionResult] = useState<(Detection & { inferenceTimeMs?: number }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load telemetry metrics from browser storage
  const reloadData = () => {
    const list = getStoredDetections();
    setRecentDetections(list);
    setStats(calculateStats(list));
  };

  useEffect(() => {
    reloadData();
  }, []);

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
    setPredictionResult(null);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPredictionResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAnalyzeItem = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    setError(null);
    setPredictionResult(null);

    try {
      // 100% In-Browser ONNX Model Execution
      const result: ClientPredictionResult = await runClientInference(selectedFile);
      
      // Save detection record into local storage & update telemetry
      const { detection, stats: newStats, allDetections } = addDetection({
        predicted_item: result.predicted_item,
        confidence: result.confidence,
        category: result.category,
        image_path: selectedFile.name,
      });

      setPredictionResult({
        ...detection,
        inferenceTimeMs: result.inferenceTimeMs,
      });
      setRecentDetections(allDetections);
      setStats(newStats);
    } catch (onnxErr: any) {
      setError(onnxErr.message || "Failed to complete item classification.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!stats) return <div className={styles.container}>Loading sorting telemetry...</div>;

  const itemsData = Object.entries(stats.items).map(([name, value]) => ({
    name,
    value,
  }));

  const trendData = [...recentDetections].slice(0, 12).reverse().map((d, index) => ({
    index: index + 1,
    confidence: Math.round(d.confidence * 100),
  }));

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.titleContainer}>
          <Recycle size={34} className={styles.logo} />
          <div>
            <h1 className={styles.title}>Smart Waste Segregation System</h1>
            <p className={styles.subtitle}>Automated Real-Time Item Classification & Facility Analytics</p>
          </div>
        </div>
        <div className={styles.statusContainer}>
          <div className={styles.status}>
            <div className={styles.statusDot} />
            System Active (ONNX Engine)
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
            <div style={{ fontSize: "0.75rem", color: "var(--secondary)", marginTop: "0.4rem" }}>
              {stats.total_processed > 0 ? Math.round((count / stats.total_processed) * 100) : 0}% of total
            </div>
          </div>
        ))}
      </div>

      {/* Waste Item Inspection Section */}
      <div className={styles.uploadSectionGrid}>
        {/* File Picker Card */}
        <div className={`${styles.uploadCard} glass-card`}>
          <h2 className={styles.chartTitle} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Scan size={18} style={{ color: "var(--primary)" }} />
            Waste Item Inspection
          </h2>

          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            style={{ display: "none" }}
          />

          {!previewUrl ? (
            <div 
              className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload size={36} style={{ color: "var(--primary)" }} />
              <div>
                <p style={{ fontWeight: 600, fontSize: "0.95rem" }}>Upload waste item image</p>
                <p style={{ fontSize: "0.8rem", color: "var(--secondary)", marginTop: "0.25rem" }}>
                  Drag & drop or click to select image file
                </p>
              </div>
            </div>
          ) : (
            <div className={styles.previewContainer} style={{ marginBottom: "1rem" }}>
              <img src={previewUrl} alt="Inspection preview" className={styles.previewImg} />
              <button className={styles.removeBtn} onClick={clearSelection} title="Remove image">
                <X size={16} />
              </button>
            </div>
          )}

          <button 
            className={styles.actionButton}
            onClick={handleAnalyzeItem}
            disabled={!selectedFile || isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                Classifying Item...
              </>
            ) : (
              <>
                <Scan size={18} />
                Analyze Item
              </>
            )}
          </button>
        </div>

        {/* Prediction Output Card */}
        <div className={`${styles.uploadCard} glass-card ${styles.resultContainer}`}>
          <div className={styles.resultHeader} style={{ marginBottom: "0.75rem" }}>
            <h2 className={styles.chartTitle} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: 0 }}>
              <Activity size={18} style={{ color: "var(--secondary)" }} />
              Classification Result
            </h2>
            {predictionResult?.inferenceTimeMs !== undefined && (
              <span className={styles.latencyBadge}>
                {predictionResult.inferenceTimeMs}ms latency
              </span>
            )}
          </div>

          {predictionResult ? (
            <div>
              <div className={styles.resultHeader}>
                <div>
                  <p style={{ fontSize: "0.8rem", color: "var(--secondary)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Detected Item</p>
                  <h3 style={{ fontSize: "1.75rem", textTransform: "capitalize", fontWeight: 700, color: ITEM_COLORS[predictionResult.predicted_item] || "var(--foreground)" }}>
                    {predictionResult.predicted_item}
                  </h3>
                </div>
                <span className={`badge ${predictionResult.category === "Recyclable" ? "badge-primary" : "badge-danger"}`} style={{ fontSize: "0.9rem", padding: "0.4rem 1rem" }}>
                  {predictionResult.category}
                </span>
              </div>

              <div style={{ marginTop: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", fontWeight: 600 }}>
                  <span>Confidence Score</span>
                  <span style={{ color: "var(--primary)" }}>{Math.round(predictionResult.confidence * 100)}%</span>
                </div>
                <div className={styles.confidenceBarBg}>
                  <div 
                    className={styles.confidenceBarFill} 
                    style={{ 
                      width: `${Math.round(predictionResult.confidence * 100)}%`,
                      backgroundColor: ITEM_COLORS[predictionResult.predicted_item] || "var(--primary)"
                    }} 
                  />
                </div>
              </div>

              <div style={{ marginTop: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--success)", fontSize: "0.875rem" }}>
                <CheckCircle2 size={16} />
                <span>Classification complete & logged into facility record.</span>
              </div>
            </div>
          ) : error ? (
            <div className={styles.errorBox}>
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong>Analysis Failed:</strong>
                <p style={{ marginTop: "0.25rem" }}>{error}</p>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", color: "var(--secondary)", padding: "2rem 1rem" }}>
              <ImageIcon size={40} style={{ strokeWidth: 1.2, opacity: 0.4, marginBottom: "0.5rem" }} />
              <p style={{ fontSize: "0.875rem" }}>Upload an image on the left and click "Analyze Item" to view real-time classification metrics.</p>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className={styles.chartsGrid}>
        <div className={`${styles.chartCard} glass-card`}>
          <h2 className={styles.chartTitle}>Waste Stream Distribution</h2>
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
                <div style={{ width: "12px", height: "4px", borderRadius: "2px", backgroundColor: ITEM_COLORS[entry.name] || "var(--primary)" }} />
                {entry.name}
              </div>
            ))}
          </div>
        </div>

        <div className={`${styles.chartCard} glass-card`}>
          <h2 className={styles.chartTitle}>Volume by Category</h2>
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
        <h2 className={styles.chartTitle}>System Confidence Trend (Recent Events)</h2>
        <div style={{ height: "240px", width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
              <XAxis dataKey="index" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--secondary)" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--secondary)" }} domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "var(--shadow-md)" }}
                formatter={(value: any) => [`${value}%`, 'Confidence']}
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
        <h2 className={styles.chartTitle}>Item Classification Audit Log</h2>
        <div style={{ overflowX: "auto" }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Item Class</th>
                <th>Category</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {recentDetections.map((detection) => (
                <tr key={detection.id}>
                  <td>
                    {detection.timestamp ? new Date(detection.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Just now'}
                  </td>
                  <td>
                    <span className="badge" style={{ 
                      backgroundColor: `${ITEM_COLORS[detection.predicted_item]}18`, 
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
                    No classification events logged.
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



