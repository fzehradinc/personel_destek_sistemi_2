import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Play, Eye, Download, Search, Trash2, RotateCcw, Rocket, CheckCircle, ZoomIn, ZoomOut, Maximize2, RotateCcw as Reset } from 'lucide-react';
import { useWebStorage } from '../hooks/useWebStorage';

interface ProcessStep {
  stepNo: number;
  description: string;
  symbolType: string;
  responsible: string;
  nextSteps: number[];
  yesNextStep?: number;
  noNextStep?: number;
  backToStep?: number;
  branchSplit?: string;
}

interface ProcessConnection {
  from: number;
  to: number;
  type: 'normal' | 'evet' | 'hayir' | 'geri' | 'dal';
  label?: string;
}

interface ProcessFlow {
  id: string;
  title: string;
  description: string;
  steps: ProcessStep[];
  uploadDate: string;
  fileName?: string;
}

interface NodeDimensions {
  width: number;
  height: number;
}

interface NodePosition {
  x: number;
  y: number;
}

const ProcessFlowComponent = () => {
  const [processFlows, setProcessFlows] = useState<ProcessFlow[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<ProcessFlow | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  // Interactive diagram state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Yükleme formu state'leri
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    file: null as File | null
  });

  // Electron Storage Hook
  const storage = useWebStorage();

  // Verileri yükle
  useEffect(() => {
    const loadData = async () => {
      if (!storage.isReady) return;

      try {
        const data = await storage.readJsonFile('process_flows.json');
        if (data && Array.isArray(data)) {
          setProcessFlows(data);
          console.log('💾 Süreç akışları yüklendi:', data.length);
        }

        const yayinData = await storage.readJsonFile('yayinda.json');
        if (yayinData && yayinData.SurecAkislari) {
          setIsPublished(true);
          console.log('📊 Süreç Akışları modülü yayın durumu: Yayında');
        }
      } catch (error) {
        console.error('❌ Veri yükleme hatası:', error);
      }
    };

    loadData();
  }, [storage.isReady]);

  // Süreç akışlarını kaydet
  const saveProcessFlows = async (data: ProcessFlow[]) => {
    try {
      const success = await storage.writeJsonFile('process_flows.json', data);
      if (success) {
        console.log('💾 Süreç akışları kaydedildi');
      } else {
        console.error('❌ Süreç akışları kaydedilemedi');
      }
    } catch (error) {
      console.error('❌ Süreç akışları kaydetme hatası:', error);
    }
  };

  // Modülü yayına alma fonksiyonu
  const publishModule = async () => {
    if (processFlows.length === 0) {
      alert('Modül yayına alınabilmesi için en az bir süreç akışı yüklenmelidir.');
      return;
    }

    if (confirm('Süreç Akışları modülünü yayına almak istediğinizden emin misiniz? Bu işlem sonrası sadece akışlar görüntülenebilir, yükleme ve değişiklik işlemleri devre dışı kalacaktır.')) {
      try {
        const success = await storage.updateYayinDurumu('SurecAkislari', true);
        if (success) {
          setIsPublished(true);
          alert('✅ Süreç Akışları modülü artık yayında!');
          console.log('🚀 Süreç Akışları modülü yayına alındı');
        } else {
          alert('❌ Yayına alma işlemi başarısız oldu.');
        }
      } catch (error) {
        console.error('❌ Yayına alma hatası:', error);
        alert('❌ Yayına alma işlemi sırasında hata oluştu.');
      }
    }
  };

  // Modülü sıfırlama fonksiyonu
  const resetModule = async () => {
    if (confirm('Süreç Akışları modülünü sıfırlamak istediğinizden emin misiniz? Tüm yüklenen akışlar ve yayın durumu silinecektir.')) {
      try {
        await storage.writeJsonFile('process_flows.json', []);
        await storage.updateYayinDurumu('SurecAkislari', false);
        
        setProcessFlows([]);
        setIsPublished(false);
        setSelectedFlow(null);
        setUploadForm({
          title: '',
          description: '',
          file: null
        });
        
        console.log('🔄 Süreç Akışları modülü sıfırlandı');
      } catch (error) {
        console.error('❌ Sıfırlama hatası:', error);
        alert('❌ Sıfırlama işlemi sırasında hata oluştu.');
      }
    }
  };

  // Excel dosyasını parse eden fonksiyon
  const parseProcessExcel = (jsonData: any[]) => {
    console.log('🔍 Excel dosyası analiz ediliyor...');
    console.log('📊 Ham veri:', jsonData);

    const steps: ProcessStep[] = [];

    jsonData.forEach((row, index) => {
      const stepNo = parseInt(row['Aşama No']?.toString() || '0');
      const description = row['Aşama Açıklaması']?.toString() || '';
      const symbolType = row['Sembol Tipi']?.toString() || '';
      const responsible = row['Sorumlu Ünvanları']?.toString() || '';
      
      const nextStepsStr = row['Sonraki Aşama No']?.toString() || '';
      const nextSteps = nextStepsStr
        .split(',')
        .map((s: string) => parseInt(s.trim()))
        .filter((n: number) => !isNaN(n) && n > 0);

      const yesNextStep = parseInt(row['Evet Durumu Sonraki Aşama']?.toString() || '0') || undefined;
      const noNextStep = parseInt(row['Hayır Durumu Sonraki Aşama']?.toString() || '0') || undefined;
      const backToStep = parseInt(row['Geriye Dönen Ok']?.toString() || '0') || undefined;
      const branchSplit = row['İkiye Ayrılan Dal']?.toString() || '';

      if (stepNo > 0 && description) {
        steps.push({
          stepNo,
          description,
          symbolType,
          responsible,
          nextSteps,
          yesNextStep,
          noNextStep,
          backToStep,
          branchSplit: branchSplit || undefined
        });

        console.log(`📋 Aşama ${stepNo}: ${description}`);
      }
    });

    return steps.sort((a, b) => a.stepNo - b.stepNo);
  };

  // Bağlantıları oluşturan fonksiyon
  const generateConnections = (steps: ProcessStep[]): ProcessConnection[] => {
    const connections: ProcessConnection[] = [];

    steps.forEach(step => {
      console.log(`🔗 Aşama ${step.stepNo} bağlantıları analiz ediliyor...`);

      // Geriye dönen ok varsa önce onu ekle
      if (step.backToStep) {
        connections.push({
          from: step.stepNo,
          to: step.backToStep,
          type: 'geri',
          label: 'Geri'
        });
        console.log(`   ↩️ Geri bağlantısı: ${step.stepNo} → ${step.backToStep}`);
      }

      // Karar adımı için özel mantık
      if (step.symbolType === 'Karar' && step.yesNextStep && step.noNextStep) {
        console.log(`   ✅ Evet/Hayır dallanması: Evet→${step.yesNextStep}, Hayır→${step.noNextStep}`);
        
        connections.push({
          from: step.stepNo,
          to: step.yesNextStep,
          type: 'evet',
          label: 'Evet'
        });

        connections.push({
          from: step.stepNo,
          to: step.noNextStep,
          type: 'hayir',
          label: 'Hayır'
        });

        return; // Karar adımı ise başka bağlantı eklememize gerek yok
      }

      // Sonraki aşamalar varsa
      if (step.nextSteps.length > 0) {
        if (step.nextSteps.length > 1) {
          console.log(`   🌿 Çoklu dallanma tespit edildi: ${step.nextSteps.join(', ')}`);

          if (step.branchSplit) {
            console.log(`   🌿 İkiye ayrılan dal: ${step.branchSplit}`);
            
            step.nextSteps.forEach(nextStep => {
              connections.push({
                from: step.stepNo,
                to: nextStep,
                type: 'dal'
              });
            });

          } else {
            console.log(`   ➡️ Normal çoklu bağlantı`);
            
            step.nextSteps.forEach(nextStep => {
              connections.push({
                from: step.stepNo,
                to: nextStep,
                type: 'normal'
              });
            });
          }

        } else {
          console.log(`   ➡️ Normal bağlantı: ${step.stepNo} → ${step.nextSteps[0]}`);
          connections.push({
            from: step.stepNo,
            to: step.nextSteps[0],
            type: 'normal'
          });
        }
      }
    });

    console.log('🔗 Toplam bağlantı sayısı:', connections.length);
    return connections;
  };

  // Text measurement utility
  const measureText = (text: string, fontSize: number = 12, fontFamily: string = 'system-ui'): { width: number; height: number } => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return { width: 0, height: 0 };
    
    context.font = `${fontSize}px ${fontFamily}`;
    const metrics = context.measureText(text);
    
    return {
      width: metrics.width,
      height: fontSize * 1.2 // Line height approximation
    };
  };

  // Calculate multiline text dimensions
  const calculateMultilineTextSize = (text: string, maxWidth: number, fontSize: number = 12): { width: number; height: number; lines: string[] } => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    let maxLineWidth = 0;

    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = measureText(testLine, fontSize).width;
      
      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          maxLineWidth = Math.max(maxLineWidth, measureText(currentLine, fontSize).width);
        }
        currentLine = word;
      }
    });
    
    if (currentLine) {
      lines.push(currentLine);
      maxLineWidth = Math.max(maxLineWidth, measureText(currentLine, fontSize).width);
    }

    return {
      width: maxLineWidth,
      height: lines.length * fontSize * 1.4, // Line height with spacing
      lines
    };
  };

  // Calculate optimal node dimensions for all steps
  const calculateNodeDimensions = (steps: ProcessStep[]): Map<number, NodeDimensions> => {
    const dimensions = new Map<number, NodeDimensions>();
    const minWidth = 180;
    const minHeight = 80;
    const padding = 20;
    const fontSize = 12;
    const titleFontSize = 14;
    
    // Find the longest texts across all steps
    let maxDescriptionWidth = 0;
    let maxResponsibleWidth = 0;
    
    steps.forEach(step => {
      const descSize = measureText(step.description || '', fontSize);
      const respSize = measureText(step.responsible || '', fontSize);
      
      maxDescriptionWidth = Math.max(maxDescriptionWidth, descSize.width);
      maxResponsibleWidth = Math.max(maxResponsibleWidth, respSize.width);
    });
    
    // Calculate optimal width based on longest content
    const optimalWidth = Math.max(
      minWidth,
      Math.min(300, maxDescriptionWidth + padding * 2),
      Math.min(280, maxResponsibleWidth + padding * 2)
    );
    
    console.log(`📏 Optimal width calculated: ${optimalWidth}px`);
    
    steps.forEach(step => {
      const maxTextWidth = optimalWidth - padding;
      
      // Calculate step number size
      const stepNumberSize = measureText(step.stepNo.toString(), titleFontSize);
      
      // Calculate description size with wrapping
      const descriptionSize = calculateMultilineTextSize(
        step.description || 'Açıklama yok',
        maxTextWidth,
        fontSize
      );
      
      // Calculate responsible size with wrapping
      const responsibleSize = calculateMultilineTextSize(
        step.responsible || 'Sorumlu belirtilmemiş',
        maxTextWidth,
        fontSize - 1 // Slightly smaller font for responsible
      );
      
      // Calculate total height needed
      const totalHeight = Math.max(
        minHeight,
        stepNumberSize.height + descriptionSize.height + responsibleSize.height + padding * 2
      );
      
      let finalWidth = optimalWidth;
      let finalHeight = totalHeight;
      
      // Special adjustments for decision nodes (diamond shape)
      if (step.symbolType === 'Karar') {
        finalWidth += 40; // Extra width for diamond shape
        finalHeight *= 1.7; // Extra height for diamond shape
      }
      
      dimensions.set(step.stepNo, {
        width: finalWidth,
        height: finalHeight
      });
      
      console.log(`📐 Step ${step.stepNo}: ${finalWidth}x${finalHeight}px`);
    });
    
    return dimensions;
  };

  // Calculate step positions with improved layout that avoids overlapping
  const calculateStepPositions = (steps: ProcessStep[], dimensions: Map<number, NodeDimensions>): Map<number, NodePosition> => {
    const positions = new Map<number, NodePosition>();
    const connections = generateConnections(steps);

    const avgWidth = Array.from(dimensions.values()).reduce((sum, dim) => sum + dim.width, 0) / dimensions.size;
    const avgHeight = Array.from(dimensions.values()).reduce((sum, dim) => sum + dim.height, 0) / dimensions.size;

    const horizontalSpacing = avgWidth + 100;
    const verticalSpacing = avgHeight + 60;

    console.log(`📏 Layout spacing: ${horizontalSpacing}x${verticalSpacing}px`);

    const visited = new Set<number>();
    const processing = new Set<number>();

    const startStep = steps.find(s => s.symbolType === 'Başlangıç') || steps[0];
    if (!startStep) return positions;

    // Calculate subtree widths with cycle detection
    const subtreeWidths = new Map<number, number>();
    const calculateSubtreeWidth = (stepNo: number, visitedNodes: Set<number> = new Set()): number => {
      // Check if we already calculated this subtree width
      if (subtreeWidths.has(stepNo)) return subtreeWidths.get(stepNo)!;
      
      // Check for cycles - if we're already processing this node, return 1 to break the cycle
      if (visitedNodes.has(stepNo)) {
        console.warn(`🔄 Cycle detected at step ${stepNo}, breaking recursion`);
        return 1;
      }
      
      // Add current node to visited set
      const newVisitedNodes = new Set(visitedNodes);
      newVisitedNodes.add(stepNo);
      
      // Find children of this step
      const children = connections.filter(c => c.from === stepNo).map(c => c.to);
      
      if (children.length === 0) {
        subtreeWidths.set(stepNo, 1);
        return 1;
      }
      
      // Calculate width as sum of children's widths
      const width = children.reduce((sum, child) => {
        return sum + calculateSubtreeWidth(child, newVisitedNodes);
      }, 0);
      
      subtreeWidths.set(stepNo, width);
      return width;
    };

    // Calculate subtree widths for all steps
    steps.forEach(step => calculateSubtreeWidth(step.stepNo));

    // Recursive layout positioning
    const positionStep = (stepNo: number, x: number, y: number, level: number = 0) => {
      if (visited.has(stepNo) || processing.has(stepNo)) return;
      processing.add(stepNo);
      positions.set(stepNo, { x, y });
      console.log(`📍 Step ${stepNo} positioned at: (${x}, ${y}) - Level: ${level}`);

      const outgoingConnections = connections.filter(c => c.from === stepNo);
      if (outgoingConnections.length === 0) {
        visited.add(stepNo);
        processing.delete(stepNo);
        return;
      }

      if (outgoingConnections.length === 1) {
        const nextStep = outgoingConnections[0].to;
        positionStep(nextStep, x, y + verticalSpacing, level + 1);
      } else {
        const totalWidth = outgoingConnections.reduce((sum, conn) => sum + (subtreeWidths.get(conn.to) ?? 1), 0);
        let offsetX = x - ((totalWidth - 1) * horizontalSpacing) / 2;

        outgoingConnections.forEach(conn => {
          const subWidth = subtreeWidths.get(conn.to) ?? 1;
          const branchX = offsetX + ((subWidth - 1) * horizontalSpacing) / 2;
          const branchY = y + verticalSpacing;
          console.log(`   🌿 Branch: Step ${conn.to} → (${branchX}, ${branchY})`);
          positionStep(conn.to, branchX, branchY, level + 1);
          offsetX += subWidth * horizontalSpacing;
        });
      }

      visited.add(stepNo);
      processing.delete(stepNo);
    };

    const startX = 400;
    const startY = 100;
    positionStep(startStep.stepNo, startX, startY);

    steps.forEach(step => {
      if (!visited.has(step.stepNo)) {
        console.log(`⚠️ Unvisited step found: ${step.stepNo}`);
        const lastY = Math.max(...Array.from(positions.values()).map(p => p.y));
        positionStep(step.stepNo, startX, lastY + verticalSpacing);
      }
    });

    return positions;
  };

  const centerDiagram = (
    positions: Map<number, NodePosition>,
    dimensions: Map<number, NodeDimensions>,
    containerWidth: number,
    containerHeight: number
  ) => {
    if (positions.size === 0) return { x: 0, y: 0 };

    // Calculate diagram bounds
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    positions.forEach((pos, stepNo) => {
      const dim = dimensions.get(stepNo) || { width: 200, height: 80 };
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x + dim.width);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y + dim.height);
    });

    const diagramWidth = maxX - minX;
    const diagramHeight = maxY - minY;

    // Sağa ve aşağıya minimum 50px boşluk bırakarak ortala
    const offsetX = Math.max((containerWidth - diagramWidth) / 2 - minX, 50);
    const offsetY = Math.max((containerHeight - diagramHeight) / 2 - minY, 50);

    console.log(`🎯 Centering diagram: offset(${offsetX}, ${offsetY}), bounds(${diagramWidth}x${diagramHeight})`);

    return { x: offsetX, y: offsetY };
  };

  // Zoom and pan controls
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev / 1.2, 0.3));
  const handleResetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };
  const handleFitToView = () => {
    setZoomLevel(0.8);
    setPanOffset({ x: 0, y: 0 });
  };

  // Mouse event handlers for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Dosya yükleme fonksiyonu
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!uploadForm.title) {
      alert('Lütfen süreç akışı için bir başlık girin.');
      return;
    }

    setLoading(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        console.log('📊 Excel dosyası işleniyor...');
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        
        const jsonData = XLSX.utils.sheet_to_json(sheet, {
          raw: false,
          defval: ''
        });
        
        console.log('📋 Excel verisi:', jsonData);

        const steps = parseProcessExcel(jsonData);
        
        if (steps.length === 0) {
          alert('Excel dosyasında geçerli süreç adımları bulunamadı. Lütfen format kontrolü yapın.');
          return;
        }

        const newFlow: ProcessFlow = {
          id: Date.now().toString(),
          title: uploadForm.title,
          description: uploadForm.description,
          steps: steps,
          uploadDate: new Date().toISOString().split('T')[0],
          fileName: file.name
        };

        const updatedFlows = [...processFlows, newFlow];
        setProcessFlows(updatedFlows);
        await saveProcessFlows(updatedFlows);

        setUploadForm({
          title: '',
          description: '',
          file: null
        });

        alert(`✅ "${newFlow.title}" süreç akışı başarıyla eklendi! ${steps.length} adım işlendi.`);
        console.log('✅ Yeni süreç akışı eklendi:', newFlow);

      } catch (error) {
        console.error('❌ Excel dosyası işleme hatası:', error);
        alert('Excel dosyası işlenirken hata oluştu. Lütfen tekrar deneyin.');
      } finally {
        setLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Süreç akışı silme
  const deleteFlow = async (flowId: string) => {
    if (confirm('Bu süreç akışını silmek istediğinizden emin misiniz?')) {
      try {
        const updatedFlows = processFlows.filter(f => f.id !== flowId);
        setProcessFlows(updatedFlows);
        await saveProcessFlows(updatedFlows);
      } catch (error) {
        console.error('❌ Süreç akışı silme hatası:', error);
        alert('❌ Süreç akışı silinirken hata oluştu.');
      }
    }
  };

  // Tüm süreç akışlarını temizle
  const clearAllFlows = async () => {
    if (confirm('Tüm süreç akışlarını silmek istediğinizden emin misiniz?')) {
      try {
        setProcessFlows([]);
        await storage.writeJsonFile('process_flows.json', []);
      } catch (error) {
        console.error('❌ Tüm süreç akışlarını temizleme hatası:', error);
        alert('❌ Süreç akışları temizlenirken hata oluştu.');
      }
    }
  };

  // Enhanced diagram rendering with auto-sizing and centering
  const renderDiagramView = (flow: ProcessFlow) => {
    if (!flow || !flow.steps || flow.steps.length === 0) {
      return (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          <div className="text-6xl mb-4">📉</div>
          <div className="text-xl font-medium mb-2">Görselleştirme için yeterli veri yok</div>
          <div>Seçilen süreç akışında gösterilecek adım bulunamadı.</div>
        </div>
      );
    }

    const connections = generateConnections(flow.steps);
    const dimensions = calculateNodeDimensions(flow.steps);
    const stepPositions = calculateStepPositions(flow.steps, dimensions);
    
    if (stepPositions.size === 0) {
      return (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          <div className="text-6xl mb-4">📍</div>
          <div className="text-xl font-medium mb-2">Pozisyon hesaplama hatası</div>
          <div>Adım pozisyonları hesaplanamadı.</div>
        </div>
      );
    }
    
    // Calculate container and diagram bounds
    const containerWidth = 1200;
    const containerHeight = 800;
    
    // Calculate SVG dimensions
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    stepPositions.forEach((pos, stepNo) => {
      const dim = dimensions.get(stepNo) || { width: 200, height: 80 };
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x + dim.width);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y + dim.height);
    });    
    const padding = 100;
    const diagramWidth = maxX - minX;
    const diagramHeight = maxY - minY;
    const svgWidth = diagramWidth + padding * 2;
    const svgHeight = diagramHeight + padding * 2;
    // Calculate centering offset
    const centerOffset = centerDiagram(stepPositions, dimensions, containerWidth, containerHeight);

    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Zoom Controls */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Zoom: {Math.round(zoomLevel * 100)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="p-2 bg-white hover:bg-gray-100 rounded-lg border border-gray-300 text-gray-700"
              title="Uzaklaştır"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomIn}
              className="p-2 bg-white hover:bg-gray-100 rounded-lg border border-gray-300 text-gray-700"
              title="Yakınlaştır"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleFitToView}
              className="p-2 bg-white hover:bg-gray-100 rounded-lg border border-gray-300 text-gray-700"
              title="Ekrana Sığdır"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetView}
              className="p-2 bg-white hover:bg-gray-100 rounded-lg border border-gray-300 text-gray-700"
              title="Görünümü Sıfırla"
            >
              <Reset className="w-4 h-4" />
            </button>
          </div>
        </div>
        {/* Diagram Container */}
        <div 
          style={{
            width: '100%',
            overflow: 'auto',
          }}
        >
          <div 
            style={{
              width: 'max-content',
              height: 'max-content',
              overflow: 'auto',
              cursor: 'grab',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <svg
              viewBox={`${minX - padding} ${minY - padding} ${svgWidth} ${svgHeight}`}
              preserveAspectRatio="xMinYMin meet"
              style={{
                width: svgWidth,
                height: svgHeight,
                transform: `translate(${panOffset.x + centerOffset.x}px, ${panOffset.y + centerOffset.y}px) scale(${zoomLevel})`,
                transformOrigin: '0 0',
                textRendering: 'geometricPrecision'
              }}
            >
              {/* Arrow markers */}
              <defs>
                <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L0,6 L9,3 z" fill="#6B7280" />
                </marker>
                <marker id="arrow-green" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L0,6 L9,3 z" fill="#10B981" />
                </marker>
                <marker id="arrow-red" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L0,6 L9,3 z" fill="#EF4444" />
                </marker>
                <marker id="arrow-orange" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L0,6 L9,3 z" fill="#F97316" />
                </marker>
                <marker id="arrow-purple" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L0,6 L9,3 z" fill="#8B5CF6" />
                </marker>
              </defs>

              {/* Connection arrows */}
              {connections.map((conn, index) => {
                const fromPos = stepPositions.get(conn.from);
                const toPos = stepPositions.get(conn.to);
                const fromDim = dimensions.get(conn.from);
                const toDim = dimensions.get(conn.to);

                if (!fromPos || !toPos || !fromDim || !toDim) {
                  console.warn(`Position error: ${conn.from} → ${conn.to}`);
                  return null;
                }

                const fromX = fromPos.x + fromDim.width / 2;
                const fromY = fromPos.y + fromDim.height;
                const toX = toPos.x + toDim.width / 2;
                const toY = toPos.y;

                const getConnectionStyle = (type: string) => {
                  switch (type) {
                    case 'evet': return { stroke: '#10B981', markerEnd: 'url(#arrow-green)' };
                    case 'hayir': return { stroke: '#EF4444', markerEnd: 'url(#arrow-red)' };
                    case 'geri': return { stroke: '#F97316', markerEnd: 'url(#arrow-orange)' };
                    case 'dal': return { stroke: '#8B5CF6', markerEnd: 'url(#arrow-purple)' };
                    default: return { stroke: '#6B7280', markerEnd: 'url(#arrow)' };
                  }
                };

                const style = getConnectionStyle(conn.type);
                const midY = fromY + (toY - fromY) / 2;

                return (
                  <g key={index}>
                    <path
                      d={`M${fromX},${fromY} L${fromX},${midY} L${toX},${midY} L${toX},${toY}`}
                      stroke={style.stroke}
                      strokeWidth={2}
                      fill="none"
                      markerEnd={style.markerEnd}
                    />
                    {conn.label && (
                      <text
                        x={(fromX + toX) / 2}
                        y={midY - 5}
                        fill={style.stroke}
                        fontSize="12"
                        fontWeight="bold"
                        textAnchor="middle"
                        className="pointer-events-none"
                      >
                        {conn.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Process boxes */}
              {flow.steps.map((step) => {
                const position = stepPositions.get(step.stepNo);
                const dimension = dimensions.get(step.stepNo);
                
                if (!position || !dimension) return null;

                const getStepStyle = (symbolType: string) => {
                  switch (symbolType) {
                    case 'Başlangıç':
                      return { fill: '#10B981', stroke: '#059669', rx: 20, textColor: 'white' };
                    case 'Süreç':
                      return { fill: '#3B82F6', stroke: '#2563EB', rx: 0, textColor: 'white' };
                    case 'Karar':
                      return { fill: '#F59E0B', stroke: '#D97706', rx: 0, textColor: 'white', isDecision: true };
                    case 'Süreç (Geçiş)':
                      return { fill: '#8B5CF6', stroke: '#7C3AED', rx: 20, textColor: 'white' };
                    default:
                      return { fill: '#6B7280', stroke: '#4B5563', rx: 0, textColor: 'white' };
                  }
                };

                const style = getStepStyle(step.symbolType);

                // Calculate text layout
                const padding = 10;
                const maxTextWidth = dimension.width - padding * 2;
                
                const descriptionLines = calculateMultilineTextSize(
                  step.description || 'Açıklama yok',
                  maxTextWidth,
                  12
                ).lines;
                
                const responsibleLines = calculateMultilineTextSize(
                  step.responsible || 'Sorumlu belirtilmemiş',
                  maxTextWidth,
                  11
                ).lines;

                const svgElements = [];

                // Shape rendering
                if (style.isDecision) {
                  // Diamond shape for decision
                  svgElements.push(
                    <path
                      key={`shape-${step.stepNo}`}
                      d={`M${position.x + dimension.width/2},${position.y} 
                          L${position.x + dimension.width},${position.y + dimension.height/2} 
                          L${position.x + dimension.width/2},${position.y + dimension.height} 
                          L${position.x},${position.y + dimension.height/2} Z`}
                      fill={style.fill}
                      stroke={style.stroke}
                      strokeWidth={2}
                    />
                  );
                } else {
                  // Rectangle for other types
                  svgElements.push(
                    <rect
                      key={`shape-${step.stepNo}`}
                      x={position.x}
                      y={position.y}
                      width={dimension.width}
                      height={dimension.height}
                      fill={style.fill}
                      stroke={style.stroke}
                      strokeWidth={2}
                      rx={style.rx}
                    />
                  );
                }

                // Text rendering
                if (style.isDecision) {
                  const totalTextHeight = 20 + descriptionLines.length * 16 + responsibleLines.length * 14 + 8;
                  let currentY = position.y + (dimension.height - totalTextHeight) / 2 + 16;

                  // Step number
                  svgElements.push(
                    <text
                      key={`${step.stepNo}-number`}
                      x={position.x + dimension.width / 2}
                      y={currentY}
                      fill={style.textColor}
                      fontSize="14"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="pointer-events-none"
                    >
                      {step.stepNo}
                    </text>
                  );
                  currentY += 20;

                  // Description lines
                  descriptionLines.forEach((line, index) => {
                    svgElements.push(
                      <text
                        key={`desc-${step.stepNo}-${index}`}
                        x={position.x + dimension.width / 2}
                        y={currentY}
                        fill={style.textColor}
                        fontSize="12"
                        fontWeight="600"
                        textAnchor="middle"
                        className="pointer-events-none"
                      >
                        {line}
                      </text>
                    );
                    currentY += 16;
                  });

                  // Responsible lines
                  currentY += 8;
                  responsibleLines.forEach((line, index) => {
                    svgElements.push(
                      <text
                        key={`resp-${step.stepNo}-${index}`}
                        x={position.x + dimension.width / 2}
                        y={currentY}
                        fill={style.textColor}
                        fontSize="11"
                        opacity="0.9"
                        textAnchor="middle"
                        className="pointer-events-none"
                      >
                        {line}
                      </text>
                    );
                    currentY += 14;
                  });
                } else {
                  // Step number
                  svgElements.push(
                    <text
                      key={`${step.stepNo}-number`}
                      x={position.x + dimension.width / 2}
                      y={position.y + 20}
                      fill={style.textColor}
                      fontSize="14"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="pointer-events-none"
                    >
                      {step.stepNo}
                    </text>
                  );

                  // Description lines
                  descriptionLines.forEach((line, index) => {
                    svgElements.push(
                      <text
                        key={`desc-${step.stepNo}-${index}`}
                        x={position.x + dimension.width / 2}
                        y={position.y + 40 + index * 16}
                        fill={style.textColor}
                        fontSize="12"
                        fontWeight="600"
                        textAnchor="middle"
                        className="pointer-events-none"
                      >
                        {line}
                      </text>
                    );
                  });

                  // Responsible lines
                  responsibleLines.forEach((line, index) => {
                    svgElements.push(
                      <text
                        key={`resp-${step.stepNo}-${index}`}
                        x={position.x + dimension.width / 2}
                        y={position.y + 40 + descriptionLines.length * 16 + 8 + index * 14}
                        fill={style.textColor}
                        fontSize="11"
                        opacity="0.9"
                        textAnchor="middle"
                        className="pointer-events-none"
                      >
                        {line}
                      </text>
                    );
                  });
                }

                return (
                  <g key={step.stepNo}>
                    {svgElements}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Navigation Help */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
          <div className="flex items-center justify-between">
            <div>🖱️ Sürükleyerek hareket ettirin • 🔍 Zoom butonlarını kullanın</div>
            <div>📐 Diyagram: {Math.round(diagramWidth)}×{Math.round(diagramHeight)}px</div>
          </div>
        </div>
      </div>
    );
  };

  // Filtreleme
  const filteredFlows = processFlows.filter(flow => {
    if (!flow) return false;
    
    const title = flow.title ?? '';
    const description = flow.description ?? '';
    const searchLower = searchTerm.toLowerCase();
    
    return title.toLowerCase().includes(searchLower) ||
           description.toLowerCase().includes(searchLower);
  });

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <div className="text-lg font-medium text-gray-700">⏳ Veriler yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Play className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">Süreç Akışları</h1>
              </div>
              <p className="text-gray-600">Excel dosyalarından süreç akışlarını yükleyin ve görselleştirin</p>
            </div>
          </div>

          {/* İstatistikler */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Toplam Akış</span>
              </div>
              <div className="text-2xl font-bold text-purple-600 mt-1">
                {processFlows.length}
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Filtrelenen</span>
              </div>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {filteredFlows.length}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Toplam Adım</span>
              </div>
              <div className="text-2xl font-bold text-green-600 mt-1">
                {processFlows.reduce((sum, flow) => sum + (flow.steps?.length || 0), 0)}
              </div>
            </div>
          </div>

          {/* Kalıcı Depolama Bilgisi */}
          {!isPublished && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="font-medium text-green-900 mb-2">
                {storage.isElectron ? '🖥️ Electron Modu - Kalıcı Depolama Aktif' : '🌐 Web Modu - Geçici Depolama'}
              </div>
              <div className="text-sm text-green-800 space-y-1">
                <div>• <strong>🎯 Otomatik Merkezleme:</strong> Diyagram yüklendiğinde otomatik olarak merkeze hizalanır</div>
                <div>• <strong>📏 Dinamik Boyutlandırma:</strong> Metin uzunluğuna göre kutu boyutları otomatik ayarlanır</div>
                <div>• <strong>📝 Akıllı Metin Sarma:</strong> Uzun metinler otomatik olarak satırlara bölünür</div>
                <div>• <strong>🔍 Zoom ve Pan:</strong> Yakınlaştırma ve sürükleme desteği</div>
              </div>
            </div>
          )}
        </div>

        {/* Yükleme Alanı */}
        {!isPublished && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5" />
              📊 Yeni Süreç Akışı Yükle
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Süreç Akışı Başlığı <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Süreç akışı başlığı"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Süreç akışı açıklaması (opsiyonel)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Excel Dosyası Seç <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="font-medium text-blue-900 mb-2">📋 Excel Format Gereksinimleri:</div>
                <div className="text-sm text-blue-800 space-y-1">
                  <div>• <strong>Aşama No:</strong> Süreç adım numarası</div>
                  <div>• <strong>Aşama Açıklaması:</strong> Adım açıklaması</div>
                  <div>• <strong>Sembol Tipi:</strong> Başlangıç, Süreç, Karar, Süreç (Geçiş)</div>
                  <div>• <strong>Sorumlu Ünvanları:</strong> Sorumlu kişi/birim</div>
                  <div>• <strong>Sonraki Aşama No:</strong> Virgülle ayrılmış sonraki adımlar</div>
                  <div>• <strong>Evet/Hayır Durumu:</strong> Karar dalları için</div>
                </div>
              </div>
            </div>

            {loading && (
              <div className="mt-4 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                <div className="text-gray-600">Excel dosyası işleniyor...</div>
              </div>
            )}
          </div>
        )}

        {/* Yayınlama Kontrolü */}
        {!isPublished && processFlows.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Rocket className="w-5 h-5" />
              Modül Yayın Kontrolü
            </h2>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 mb-2">
                  {processFlows.length} süreç akışı yüklendi. Modülü yayına almaya hazır mısınız?
                </p>
                <p className="text-sm text-gray-500">
                  Yayına aldıktan sonra sadece akışlar görüntülenebilir.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={resetModule}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Modülü Sıfırla
                </button>
                <button
                  onClick={publishModule}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Rocket className="w-4 h-4" />
                  Modül Yayına Hazır
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Arama */}
        {processFlows.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Süreç akışlarında ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {filteredFlows.length > 0 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{filteredFlows.length}</span> süreç akışı bulundu
                </div>
                {!isPublished && (
                  <div className="flex items-center gap-4">
                    <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      ✏️ Düzenleme modu aktif
                    </div>
                    <button
                      onClick={clearAllFlows}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Tümünü Temizle
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Süreç Akışları */}
        {selectedFlow ? (
          // Seçili akış detayı
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedFlow.title}</h2>
                  {selectedFlow.description && (
                    <p className="text-gray-600 mt-1">{selectedFlow.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span>📅 {new Date(selectedFlow.uploadDate).toLocaleDateString('tr-TR')}</span>
                    <span>📊 {selectedFlow.steps?.length || 0} Adım</span>
                    {selectedFlow.fileName && <span>📁 {selectedFlow.fileName}</span>}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFlow(null)}
                  className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
                >
                  ← Listeye Dön
                </button>
              </div>
            </div>

            {/* Enhanced Diagram */}
            {renderDiagramView(selectedFlow)}
          </div>
        ) : filteredFlows.length > 0 ? (
          // Akış listesi
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFlows.map((flow) => (
              <div key={flow.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1">
                      {flow.title || 'Başlıksız Akış'}
                    </h3>
                    {!isPublished && (
                      <button
                        onClick={() => deleteFlow(flow.id)}
                        className="text-red-600 hover:text-red-800 p-1 ml-2"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {flow.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {flow.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <span>{new Date(flow.uploadDate).toLocaleDateString('tr-TR')}</span>
                    <span>{flow.steps?.length || 0} Adım</span>
                  </div>

                  {flow.fileName && (
                    <div className="text-xs text-gray-500 mb-4 flex items-center gap-1">
                      <span>📁</span>
                      <span className="truncate">{flow.fileName}</span>
                    </div>
                  )}

                  <button
                    onClick={() => setSelectedFlow(flow)}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Akışı Görüntüle
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Boş durum
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
            <div className="text-center text-gray-500">
              <div className="text-6xl mb-4">🔄</div>
              <div className="text-xl font-medium mb-2">
                {processFlows.length === 0 
                  ? 'Henüz süreç akışı yüklenmemiş'
                  : 'Süreç akışı bulunamadı'
                }
              </div>
              <div className="text-gray-600">
                {processFlows.length === 0 
                  ? isPublished 
                    ? 'Bu modül yayında ancak henüz süreç akışı bulunmuyor'
                    : 'Excel dosyanızı yükleyerek başlayın'
                  : 'Arama kriterlerinizi değiştirerek tekrar deneyin'
                }
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessFlowComponent;