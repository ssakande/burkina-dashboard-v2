import React, { useState, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Configuration
const MONTHS_ORDER = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const YEARS = [2018, 2019, 2020, 2021, 2022];
const COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#14B8A6', '#F97316', '#6366F1', '#84CC16', '#A855F7', '#06B6D4'];
const BURKINA_CENTER = [12.3, -1.5];

// Composant MapUpdater pour recentrer la carte
const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  React.useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

// Utilitaires
const formatNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return Math.round(num).toLocaleString('fr-FR');
};

const getColor = (value, max) => {
  const ratio = value / max;
  if (ratio > 0.75) return '#DC2626';
  if (ratio > 0.5) return '#F59E0B';
  if (ratio > 0.25) return '#FCD34D';
  return '#10B981';
};

// Composant principal
const BurkinaDashboard = () => {
  // États
  const [selectedPage, setSelectedPage] = useState('dashboard');
  const [selectedYear, setSelectedYear] = useState(2022);
  const [selectedMonth, setSelectedMonth] = useState('Décembre');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedProvince, setSelectedProvince] = useState('all');
  const [mapView, setMapView] = useState('regions'); // 'regions' ou 'provinces'
  const [mapLayer, setMapLayer] = useState('closures'); // 'closures', 'idps', 'incidents', 'needs'

  // Chargement des données depuis le backend
  const [burkinaData, setBurkinaData] = useState([]);
  const [regionsGeoJSON, setRegionsGeoJSON] = useState(null);
  const [provincesGeoJSON, setProvincesGeoJSON] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [loadingError, setLoadingError] = useState(null);

  // État pour le suivi du chargement
  const [loadingProgress, setLoadingProgress] = React.useState('');
  const [loadingError, setLoadingError] = React.useState(null);

  // Charger les données au montage
  React.useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingProgress('Chargement des données principales...');
        console.log('Début du chargement des données');
        
        // Charger les données principales
        const dataResponse = await fetch('./burkina-data.json');
        if (!dataResponse.ok) {
          throw new Error('Fichier burkina-data.json introuvable');
        }
        const data = await dataResponse.json();
        console.log('Données chargées:', data.length, 'enregistrements');
        setBurkinaData(data);
        
        setLoadingProgress('Chargement des régions (4.5 MB)...');
        console.log('Chargement des régions...');
        
        // Charger les régions
        const regionsResponse = await fetch('./burkina-regions-simplified.json');
        if (!regionsResponse.ok) {
          throw new Error('Fichier burkina-regions-simplified.json introuvable');
        }
        const regions = await regionsResponse.json();
        console.log('Régions chargées:', regions.features.length, 'features');
        setRegionsGeoJSON(regions);
        
        setLoadingProgress('Chargement des provinces (9 MB)... Cela peut prendre quelques secondes');
        console.log('Chargement des provinces...');
        
        // Charger les provinces
        const provincesResponse = await fetch('./burkina-provinces-simplified.json');
        if (!provincesResponse.ok) {
          throw new Error('Fichier burkina-provinces-simplified.json introuvable');
        }
        const provinces = await provincesResponse.json();
        console.log('Provinces chargées:', provinces.features.length, 'features');
        setProvincesGeoJSON(provinces);
        
        setLoadingProgress('Finalisation...');
        console.log('Chargement terminé avec succès');
        setLoading(false);
      } catch (error) {
        console.error('ERREUR de chargement:', error);
        setLoadingError(error.message);
        setLoadingProgress('');
      }
    };

    loadData();
  }, []);

  // Filtrer les données selon les sélections
  const filteredData = useMemo(() => {
    if (!burkinaData || burkinaData.length === 0) return [];
    
    return burkinaData.filter(row => {
      // Filtrer par année et mois (obligatoires)
      if (row.Year !== selectedYear) return false;
      if (row.Month !== selectedMonth) return false;
      
      // Filtrer par région si sélectionnée
      if (selectedRegion !== 'all' && row.Region !== selectedRegion) return false;
      
      // Filtrer par province si sélectionnée
      if (selectedProvince !== 'all' && row.Province !== selectedProvince) return false;
      
      return true;
    });
  }, [burkinaData, selectedYear, selectedMonth, selectedRegion, selectedProvince]);

  // Calculer les agrégations pour la période sélectionnée
  const aggregatedStats = useMemo(() => {
    if (!filteredData || filteredData.length === 0) {
      return {
        totalSchools: 0,
        schoolsClosed: 0,
        closureRate: 0,
        childrenAffected: 0,
        teachersAffected: 0,
        schoolsReopened: 0,
        reopeningRate: 0,
        totalIDPs: 0,
        schoolAgeIDPs: 0,
        incidents: 0,
        healthIncidents: 0,
        educIncidents: 0,
        totalPop: 0,
        schoolAgePop: 0,
        totalPIN: 0,
        educPIN: 0
      };
    }

    const stats = filteredData.reduce((acc, row) => {
      acc.totalSchools += row.NbTotalSchool || 0;
      acc.schoolsClosed += row.SchoolClosed || 0;
      acc.childrenAffected += row.ChildrenAffected || 0;
      acc.teachersAffected += row.TeacherAffected || 0;
      acc.schoolsReopened += row.SchoolReopened || 0;
      acc.totalIDPs += row.IDPs || 0;
      acc.schoolAgeIDPs += row.IDPs_SchoolAge || 0;
      acc.incidents += row.NbEvents || 0;
      acc.healthIncidents += row.NbHealthEvents || 0;
      acc.educIncidents += row.NbEducEvents || 0;
      acc.totalPop += row.TotalPop || 0;
      acc.schoolAgePop += row.SchoolAgePop || 0;
      acc.totalPIN += row.TotalPIN || 0;
      acc.educPIN += row.EducationPIN || 0;
      return acc;
    }, {
      totalSchools: 0,
      schoolsClosed: 0,
      childrenAffected: 0,
      teachersAffected: 0,
      schoolsReopened: 0,
      totalIDPs: 0,
      schoolAgeIDPs: 0,
      incidents: 0,
      healthIncidents: 0,
      educIncidents: 0,
      totalPop: 0,
      schoolAgePop: 0,
      totalPIN: 0,
      educPIN: 0
    });

    stats.closureRate = stats.totalSchools > 0 ? (stats.schoolsClosed / stats.totalSchools) * 100 : 0;
    stats.reopeningRate = stats.schoolsClosed > 0 ? (stats.schoolsReopened / stats.schoolsClosed) * 100 : 0;

    return stats;
  }, [filteredData]);

  // Obtenir les listes de régions et provinces
  const regions = useMemo(() => {
    if (!burkinaData || burkinaData.length === 0) return [];
    return [...new Set(burkinaData.map(d => d.Region))].sort();
  }, [burkinaData]);

  const provinces = useMemo(() => {
    if (!burkinaData || burkinaData.length === 0) return [];
    let provinceList = burkinaData;
    if (selectedRegion !== 'all') {
      provinceList = provinceList.filter(d => d.Region === selectedRegion);
    }
    return [...new Set(provinceList.map(d => d.Province))].sort();
  }, [burkinaData, selectedRegion]);

  // Données pour évolution temporelle (toutes les années, mois sélectionné)
  const temporalData = useMemo(() => {
    if (!burkinaData || burkinaData.length === 0) return [];
    
    const dataByYear = {};
    
    burkinaData.forEach(row => {
      if (row.Month !== selectedMonth) return;
      if (selectedRegion !== 'all' && row.Region !== selectedRegion) return;
      if (selectedProvince !== 'all' && row.Province !== selectedProvince) return;
      
      const year = row.Year;
      if (!dataByYear[year]) {
        dataByYear[year] = {
          year,
          totalSchools: 0,
          schoolsClosed: 0,
          childrenAffected: 0,
          idps: 0,
          incidents: 0
        };
      }
      
      dataByYear[year].totalSchools += row.NbTotalSchool || 0;
      dataByYear[year].schoolsClosed += row.SchoolClosed || 0;
      dataByYear[year].childrenAffected += row.ChildrenAffected || 0;
      dataByYear[year].idps += row.IDPs || 0;
      dataByYear[year].incidents += row.NbEvents || 0;
    });
    
    return YEARS.map(year => dataByYear[year] || {
      year,
      totalSchools: 0,
      schoolsClosed: 0,
      childrenAffected: 0,
      idps: 0,
      incidents: 0
    }).map(d => ({
      ...d,
      closureRate: d.totalSchools > 0 ? (d.schoolsClosed / d.totalSchools * 100) : 0
    }));
  }, [burkinaData, selectedMonth, selectedRegion, selectedProvince]);

  // Données par région pour l'année et mois sélectionnés
  const regionalData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
    
    const dataByRegion = {};
    
    filteredData.forEach(row => {
      const region = row.Region;
      if (!dataByRegion[region]) {
        dataByRegion[region] = {
          region,
          totalSchools: 0,
          schoolsClosed: 0,
          childrenAffected: 0,
          idps: 0,
          schoolAgeIDPs: 0,
          incidents: 0,
          population: 0,
          schoolAgePop: 0
        };
      }
      
      dataByRegion[region].totalSchools += row.NbTotalSchool || 0;
      dataByRegion[region].schoolsClosed += row.SchoolClosed || 0;
      dataByRegion[region].childrenAffected += row.ChildrenAffected || 0;
      dataByRegion[region].idps += row.IDPs || 0;
      dataByRegion[region].schoolAgeIDPs += row.IDPs_SchoolAge || 0;
      dataByRegion[region].incidents += row.NbEvents || 0;
      dataByRegion[region].population += row.TotalPop || 0;
      dataByRegion[region].schoolAgePop += row.SchoolAgePop || 0;
    });
    
    return Object.values(dataByRegion).map(d => ({
      ...d,
      closureRate: d.totalSchools > 0 ? (d.schoolsClosed / d.totalSchools * 100) : 0
    })).sort((a, b) => b.closureRate - a.closureRate);
  }, [filteredData]);

  // Données par province
  const provincialData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
    
    const dataByProvince = {};
    
    filteredData.forEach(row => {
      const province = row.Province;
      const region = row.Region;
      if (!dataByProvince[province]) {
        dataByProvince[province] = {
          province,
          region,
          admin2pcod: row.admin2pcod,
          totalSchools: 0,
          schoolsClosed: 0,
          childrenAffected: 0,
          idps: 0,
          schoolAgeIDPs: 0,
          incidents: 0,
          population: 0,
          schoolAgePop: 0
        };
      }
      
      dataByProvince[province].totalSchools += row.NbTotalSchool || 0;
      dataByProvince[province].schoolsClosed += row.SchoolClosed || 0;
      dataByProvince[province].childrenAffected += row.ChildrenAffected || 0;
      dataByProvince[province].idps += row.IDPs || 0;
      dataByProvince[province].schoolAgeIDPs += row.IDPs_SchoolAge || 0;
      dataByProvince[province].incidents += row.NbEvents || 0;
      dataByProvince[province].population += row.TotalPop || 0;
      dataByProvince[province].schoolAgePop += row.SchoolAgePop || 0;
    });
    
    return Object.values(dataByProvince).map(d => ({
      ...d,
      closureRate: d.totalSchools > 0 ? (d.schoolsClosed / d.totalSchools * 100) : 0
    })).sort((a, b) => b.closureRate - a.closureRate);
  }, [filteredData]);

  // Style de la carte choroplèthe
  const getFeatureStyle = (feature) => {
    const isRegionView = mapView === 'regions';
    const data = isRegionView ? regionalData : provincialData;
    const nameKey = isRegionView ? 'ADM1_FR' : 'ADM2_FR';
    const dataKey = isRegionView ? 'region' : 'province';
    
    const featureName = feature.properties[nameKey];
    const featureData = data.find(d => d[dataKey] === featureName);
    
    if (!featureData) {
      return {
        fillColor: '#E5E7EB',
        fillOpacity: 0.5,
        color: '#9CA3AF',
        weight: 1
      };
    }
    
    let value, maxValue;
    
    switch (mapLayer) {
      case 'closures':
        value = featureData.closureRate;
        maxValue = 100;
        break;
      case 'idps':
        value = featureData.idps;
        maxValue = Math.max(...data.map(d => d.idps));
        break;
      case 'incidents':
        value = featureData.incidents;
        maxValue = Math.max(...data.map(d => d.incidents));
        break;
      case 'needs':
        value = featureData.childrenAffected;
        maxValue = Math.max(...data.map(d => d.childrenAffected));
        break;
      default:
        value = 0;
        maxValue = 1;
    }
    
    return {
      fillColor: getColor(value, maxValue),
      fillOpacity: 0.7,
      color: '#1F2937',
      weight: 1.5
    };
  };

  const onEachFeature = (feature, layer) => {
    const isRegionView = mapView === 'regions';
    const data = isRegionView ? regionalData : provincialData;
    const nameKey = isRegionView ? 'ADM1_FR' : 'ADM2_FR';
    const dataKey = isRegionView ? 'region' : 'province';
    
    const featureName = feature.properties[nameKey];
    const featureData = data.find(d => d[dataKey] === featureName);
    
    if (featureData) {
      const popupContent = `
        <div class="p-2">
          <h3 class="font-bold text-sm mb-1">${featureName}</h3>
          ${!isRegionView ? `<p class="text-xs text-gray-600">${featureData.region}</p>` : ''}
          <div class="text-xs mt-2 space-y-1">
            <p><strong>Écoles fermées:</strong> ${featureData.schoolsClosed} / ${featureData.totalSchools} (${featureData.closureRate.toFixed(1)}%)</p>
            <p><strong>Enfants affectés:</strong> ${formatNumber(featureData.childrenAffected)}</p>
            <p><strong>PDI:</strong> ${formatNumber(featureData.idps)}</p>
            <p><strong>Incidents:</strong> ${featureData.incidents}</p>
          </div>
        </div>
      `;
      layer.bindPopup(popupContent);
    }
    
    layer.on({
      mouseover: (e) => {
        e.target.setStyle({
          weight: 3,
          color: '#6366F1'
        });
      },
      mouseout: (e) => {
        e.target.setStyle({
          weight: 1.5,
          color: '#1F2937'
        });
      }
    });
  };

  // Composant Légende pour les cartes
  const MapLegend = ({ layer }) => {
    const getLegendItems = () => {
      switch (layer) {
        case 'closures':
          return [
            { color: '#10B981', label: '0-25% fermées', range: '0-25%' },
            { color: '#FCD34D', label: '25-50% fermées', range: '25-50%' },
            { color: '#F59E0B', label: '50-75% fermées', range: '50-75%' },
            { color: '#DC2626', label: '75-100% fermées', range: '75-100%' }
          ];
        case 'idps':
          return [
            { color: '#10B981', label: 'Faible', range: '< 25%' },
            { color: '#FCD34D', label: 'Moyen', range: '25-50%' },
            { color: '#F59E0B', label: 'Élevé', range: '50-75%' },
            { color: '#DC2626', label: 'Très élevé', range: '> 75%' }
          ];
        case 'incidents':
          return [
            { color: '#10B981', label: 'Faible', range: '< 25%' },
            { color: '#FCD34D', label: 'Moyen', range: '25-50%' },
            { color: '#F59E0B', label: 'Élevé', range: '50-75%' },
            { color: '#DC2626', label: 'Très élevé', range: '> 75%' }
          ];
        case 'needs':
          return [
            { color: '#10B981', label: 'Faible', range: '< 25%' },
            { color: '#FCD34D', label: 'Moyen', range: '25-50%' },
            { color: '#F59E0B', label: 'Élevé', range: '50-75%' },
            { color: '#DC2626', label: 'Critique', range: '> 75%' }
          ];
        default:
          return [];
      }
    };

    const items = getLegendItems();

    return (
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 z-[1000]" style={{ minWidth: '180px' }}>
        <h4 className="text-xs font-bold text-gray-700 mb-2">Légende</h4>
        <div className="space-y-1">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded border border-gray-300" 
                style={{ backgroundColor: item.color }}
              ></div>
              <span className="text-xs text-gray-700">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Composants de page
  const DashboardPage = () => (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-xl shadow-lg">
          <div className="text-sm font-medium opacity-90">Taux de fermeture</div>
          <div className="text-3xl font-bold mt-2">{aggregatedStats.closureRate.toFixed(1)}%</div>
          <div className="text-sm mt-1 opacity-75">{formatNumber(aggregatedStats.schoolsClosed)} / {formatNumber(aggregatedStats.totalSchools)} écoles</div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-xl shadow-lg">
          <div className="text-sm font-medium opacity-90">Enfants affectés</div>
          <div className="text-3xl font-bold mt-2">{formatNumber(aggregatedStats.childrenAffected)}</div>
          <div className="text-sm mt-1 opacity-75">{formatNumber(aggregatedStats.teachersAffected)} enseignants</div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
          <div className="text-sm font-medium opacity-90">Personnes déplacées</div>
          <div className="text-3xl font-bold mt-2">{formatNumber(aggregatedStats.totalIDPs)}</div>
          <div className="text-sm mt-1 opacity-75">{formatNumber(aggregatedStats.schoolAgeIDPs)} en âge scolaire</div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
          <div className="text-sm font-medium opacity-90">Incidents de sécurité</div>
          <div className="text-3xl font-bold mt-2">{formatNumber(aggregatedStats.incidents)}</div>
          <div className="text-sm mt-1 opacity-75">{formatNumber(aggregatedStats.educIncidents)} liés à l'éducation</div>
        </div>
      </div>

      {/* Carte et graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Carte */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Carte de situation</h2>
            <div className="flex gap-2">
              <select 
                value={mapView}
                onChange={(e) => setMapView(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
              >
                <option value="regions">Régions</option>
                <option value="provinces">Provinces</option>
              </select>
              <select 
                value={mapLayer}
                onChange={(e) => setMapLayer(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
              >
                <option value="closures">Fermetures d'écoles</option>
                <option value="idps">Déplacements</option>
                <option value="incidents">Incidents</option>
                <option value="needs">Besoins éducatifs</option>
              </select>
            </div>
          </div>
          
          <div className="h-96 rounded-lg overflow-hidden relative">
            <MapContainer center={BURKINA_CENTER} zoom={6} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              <MapUpdater center={BURKINA_CENTER} zoom={6} />
              
              {mapView === 'regions' && regionsGeoJSON && (
                <GeoJSON 
                  data={regionsGeoJSON} 
                  style={getFeatureStyle}
                  onEachFeature={onEachFeature}
                />
              )}
              
              {mapView === 'provinces' && provincesGeoJSON && (
                <GeoJSON 
                  data={provincesGeoJSON} 
                  style={getFeatureStyle}
                  onEachFeature={onEachFeature}
                />
              )}
            </MapContainer>
            <MapLegend layer={mapLayer} />
          </div>
        </div>

        {/* Évolution temporelle */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Évolution du taux de fermeture</h2>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={temporalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="year" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                formatter={(value) => `${value.toFixed(1)}%`}
              />
              <Legend />
              <Line type="monotone" dataKey="closureRate" name="Taux de fermeture (%)" stroke="#EF4444" strokeWidth={3} dot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Comparaison régionale */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Comparaison régionale</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={regionalData.slice(0, 10)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="region" angle={-45} textAnchor="end" height={120} stroke="#6B7280" />
            <YAxis stroke="#6B7280" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
            />
            <Legend />
            <Bar dataKey="schoolsClosed" name="Écoles fermées" fill="#EF4444" />
            <Bar dataKey="idps" name="PDI" fill="#3B82F6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const EducationPage = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="text-sm font-medium text-gray-600">Écoles fermées</div>
          <div className="text-3xl font-bold text-red-600 mt-2">{formatNumber(aggregatedStats.schoolsClosed)}</div>
          <div className="text-sm text-gray-500 mt-1">sur {formatNumber(aggregatedStats.totalSchools)} écoles</div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="text-sm font-medium text-gray-600">Enfants affectés</div>
          <div className="text-3xl font-bold text-orange-600 mt-2">{formatNumber(aggregatedStats.childrenAffected)}</div>
          <div className="text-sm text-gray-500 mt-1">{(aggregatedStats.childrenAffected / aggregatedStats.schoolAgePop * 100).toFixed(1)}% de la pop. scolaire</div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="text-sm font-medium text-gray-600">Taux de réouverture</div>
          <div className="text-3xl font-bold text-green-600 mt-2">{aggregatedStats.reopeningRate.toFixed(1)}%</div>
          <div className="text-sm text-gray-500 mt-1">{formatNumber(aggregatedStats.schoolsReopened)} écoles rouvertes</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Taux de fermeture par région</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={regionalData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" stroke="#6B7280" />
              <YAxis dataKey="region" type="category" width={150} stroke="#6B7280" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                formatter={(value) => `${value.toFixed(1)}%`}
              />
              <Bar dataKey="closureRate" name="Taux de fermeture (%)" fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Évolution des fermetures</h2>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={temporalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="year" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
              />
              <Legend />
              <Area type="monotone" dataKey="schoolsClosed" name="Écoles fermées" fill="#EF4444" stroke="#DC2626" />
              <Area type="monotone" dataKey="childrenAffected" name="Enfants affectés" fill="#F59E0B" stroke="#D97706" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 10 provinces */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Top 10 provinces les plus affectées</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Province</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Région</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Écoles fermées</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Taux (%)</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Enfants affectés</th>
              </tr>
            </thead>
            <tbody>
              {provincialData.slice(0, 10).map((row, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{row.province}</td>
                  <td className="py-3 px-4 text-gray-600">{row.region}</td>
                  <td className="py-3 px-4 text-right">{row.schoolsClosed} / {row.totalSchools}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={`px-2 py-1 rounded-full text-sm font-semibold ${
                      row.closureRate > 75 ? 'bg-red-100 text-red-800' :
                      row.closureRate > 50 ? 'bg-orange-100 text-orange-800' :
                      row.closureRate > 25 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {row.closureRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">{formatNumber(row.childrenAffected)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const DeplacementsPage = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="text-sm font-medium text-gray-600">Total PDI</div>
          <div className="text-3xl font-bold text-blue-600 mt-2">{formatNumber(aggregatedStats.totalIDPs)}</div>
          <div className="text-sm text-gray-500 mt-1">{(aggregatedStats.totalIDPs / aggregatedStats.totalPop * 100).toFixed(1)}% de la population</div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="text-sm font-medium text-gray-600">PDI en âge scolaire</div>
          <div className="text-3xl font-bold text-purple-600 mt-2">{formatNumber(aggregatedStats.schoolAgeIDPs)}</div>
          <div className="text-sm text-gray-500 mt-1">{(aggregatedStats.schoolAgeIDPs / aggregatedStats.totalIDPs * 100).toFixed(1)}% des PDI</div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="text-sm font-medium text-gray-600">Besoins éducatifs (PIN)</div>
          <div className="text-3xl font-bold text-indigo-600 mt-2">{formatNumber(aggregatedStats.educPIN)}</div>
          <div className="text-sm text-gray-500 mt-1">sur {formatNumber(aggregatedStats.totalPIN)} PIN total</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Évolution des déplacements</h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={temporalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="year" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
              />
              <Legend />
              <Line type="monotone" dataKey="idps" name="PDI" stroke="#3B82F6" strokeWidth={3} dot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">PDI par région</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={regionalData.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="region" angle={-45} textAnchor="end" height={120} stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
              />
              <Bar dataKey="idps" name="PDI" fill="#3B82F6" />
              <Bar dataKey="schoolAgeIDPs" name="PDI en âge scolaire" fill="#8B5CF6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Carte heatmap */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Carte des déplacements</h2>
        <div className="h-96 rounded-lg overflow-hidden relative">
          <MapContainer center={BURKINA_CENTER} zoom={6} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            <MapUpdater center={BURKINA_CENTER} zoom={6} />
            
            {mapView === 'regions' && regionsGeoJSON && (
              <GeoJSON 
                data={regionsGeoJSON} 
                style={getFeatureStyle}
                onEachFeature={onEachFeature}
              />
            )}
            
            {mapView === 'provinces' && provincesGeoJSON && (
              <GeoJSON 
                data={provincesGeoJSON} 
                style={getFeatureStyle}
                onEachFeature={onEachFeature}
              />
            )}
          </MapContainer>
          <MapLegend layer="idps" />
        </div>
      </div>
    </div>
  );

  const SecuritePage = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="text-sm font-medium text-gray-600">Incidents totaux</div>
          <div className="text-3xl font-bold text-red-600 mt-2">{formatNumber(aggregatedStats.incidents)}</div>
          <div className="text-sm text-gray-500 mt-1">pour la période</div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="text-sm font-medium text-gray-600">Incidents éducation</div>
          <div className="text-3xl font-bold text-orange-600 mt-2">{formatNumber(aggregatedStats.educIncidents)}</div>
          <div className="text-sm text-gray-500 mt-1">{(aggregatedStats.educIncidents / aggregatedStats.incidents * 100).toFixed(1)}% du total</div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="text-sm font-medium text-gray-600">Incidents santé</div>
          <div className="text-3xl font-bold text-blue-600 mt-2">{formatNumber(aggregatedStats.healthIncidents)}</div>
          <div className="text-sm text-gray-500 mt-1">{(aggregatedStats.healthIncidents / aggregatedStats.incidents * 100).toFixed(1)}% du total</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Évolution des incidents</h2>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={temporalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="year" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
              />
              <Legend />
              <Area type="monotone" dataKey="incidents" name="Total incidents" fill="#EF4444" stroke="#DC2626" stackId="1" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Incidents par région</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={regionalData.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="region" angle={-45} textAnchor="end" height={120} stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
              />
              <Bar dataKey="incidents" name="Incidents" fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const AnalysesPage = () => {
    const correlationData = regionalData.map(d => ({
      region: d.region,
      incidents: d.incidents,
      closureRate: d.closureRate,
      idps: d.idps / 1000 // En milliers pour meilleure lisibilité
    }));

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Corrélation incidents - fermetures d'écoles</h2>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="incidents" name="Incidents" stroke="#6B7280" />
              <YAxis dataKey="closureRate" name="Taux de fermeture (%)" stroke="#6B7280" />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                formatter={(value, name) => [
                  name === 'closureRate' ? `${value.toFixed(1)}%` : value,
                  name === 'incidents' ? 'Incidents' : 'Taux de fermeture'
                ]}
              />
              <Scatter name="Régions" data={correlationData} fill="#8B5CF6" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Vue d'ensemble multidimensionnelle</h2>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={regionalData.slice(0, 5).map(d => ({
                region: d.region.substring(0, 15),
                'Fermetures': d.closureRate,
                'PDI (x1000)': d.idps / 1000,
                'Incidents': d.incidents * 2,
                'Enfants affectés (x100)': d.childrenAffected / 100
              }))}>
                <PolarGrid stroke="#E5E7EB" />
                <PolarAngleAxis dataKey="region" stroke="#6B7280" />
                <PolarRadiusAxis stroke="#6B7280" />
                <Radar name="Indicateurs" dataKey="Fermetures" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Distribution des impacts</h2>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={regionalData.slice(0, 8).map(d => ({
                    name: d.region,
                    value: d.schoolsClosed
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({name, percent}) => `${name.substring(0, 10)}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {regionalData.slice(0, 8).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Comparaison multi-critères</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={regionalData.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="region" angle={-45} textAnchor="end" height={120} stroke="#6B7280" />
              <YAxis yAxisId="left" stroke="#6B7280" />
              <YAxis yAxisId="right" orientation="right" stroke="#6B7280" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#FFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="closureRate" name="Taux de fermeture (%)" fill="#EF4444" />
              <Bar yAxisId="right" dataKey="incidents" name="Incidents" fill="#F59E0B" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  // Rendu du composant principal
  if (loadingError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-red-600 mb-2">Erreur de chargement</h1>
            <p className="text-gray-700 mb-4">{loadingError}</p>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-red-800 mb-2">Vérifications à effectuer :</h3>
            <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
              <li>Tous les fichiers sont dans le même dossier</li>
              <li>Les fichiers GeoJSON simplifiés sont présents</li>
              <li>Vous utilisez un serveur HTTP (pas file://)</li>
              <li>Votre connexion internet fonctionne</li>
            </ul>
          </div>

          <div className="space-y-2">
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700"
            >
              Réessayer
            </button>
            <button 
              onClick={() => window.open('diagnostic.html', '_blank')}
              className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700"
            >
              Ouvrir le diagnostic
            </button>
          </div>

          <div className="mt-6 text-xs text-gray-500">
            <p><strong>Astuce :</strong> Ouvrez la Console du navigateur (F12) pour plus de détails</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-xl shadow-2xl p-8 max-w-md">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700 mb-2">Chargement des données...</p>
          {loadingProgress && (
            <p className="text-sm text-gray-500">{loadingProgress}</p>
          )}
          <div className="mt-4 text-xs text-gray-400">
            <p>Les fichiers géographiques sont volumineux.</p>
            <p>Première visite : ~15 secondes</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl">
        <div className="container mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold mb-2">Dashboard Humanitaire - Burkina Faso</h1>
          <p className="text-indigo-100 text-lg">Analyse de la situation éducative et sécuritaire</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white shadow-md sticky top-0 z-40">
        <div className="container mx-auto px-6">
          <div className="flex gap-1 py-2 overflow-x-auto">
            {[
              { id: 'dashboard', label: '📊 Vue d\'ensemble', icon: '📊' },
              { id: 'education', label: '🏫 Éducation', icon: '🏫' },
              { id: 'deplacements', label: '👥 Déplacements', icon: '👥' },
              { id: 'securite', label: '⚠️ Sécurité', icon: '⚠️' },
              { id: 'analyses', label: '📈 Analyses croisées', icon: '📈' }
            ].map(page => (
              <button
                key={page.id}
                onClick={() => setSelectedPage(page.id)}
                className={`px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  selectedPage === page.id
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {page.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white shadow-md mb-6">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="font-semibold text-gray-700">Année:</label>
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {YEARS.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="font-semibold text-gray-700">Mois:</label>
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {MONTHS_ORDER.map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="font-semibold text-gray-700">Région:</label>
              <select 
                value={selectedRegion}
                onChange={(e) => {
                  setSelectedRegion(e.target.value);
                  setSelectedProvince('all');
                }}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">Toutes les régions</option>
                {regions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="font-semibold text-gray-700">Province:</label>
              <select 
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={selectedRegion === 'all'}
              >
                <option value="all">Toutes les provinces</option>
                {provinces.map(province => (
                  <option key={province} value={province}>{province}</option>
                ))}
              </select>
            </div>

            <div className="ml-auto text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-lg">
              <strong>Période:</strong> {selectedMonth} {selectedYear}
              {selectedRegion !== 'all' && ` • ${selectedRegion}`}
              {selectedProvince !== 'all' && ` • ${selectedProvince}`}
            </div>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="container mx-auto px-6 pb-12">
        {selectedPage === 'dashboard' && <DashboardPage />}
        {selectedPage === 'education' && <EducationPage />}
        {selectedPage === 'deplacements' && <DeplacementsPage />}
        {selectedPage === 'securite' && <SecuritePage />}
        {selectedPage === 'analyses' && <AnalysesPage />}
      </div>

      {/* Footer */}
      <div className="bg-gray-800 text-white py-6 mt-12">
        <div className="container mx-auto px-6 text-center">
          <p className="text-sm">Dashboard Burkina Faso - Données {selectedMonth} {selectedYear}</p>
          <p className="text-xs text-gray-400 mt-1">Analyse de la situation humanitaire et éducative</p>
        </div>
      </div>
    </div>
  );
};

export default BurkinaDashboard;