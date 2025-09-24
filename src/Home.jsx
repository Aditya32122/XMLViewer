import React, { useState } from 'react';
import { Search, FileText, Folder, Download, Calendar, User, Shield, Database, Hash, SortAsc, SortDesc, Filter } from 'lucide-react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [xmlData, setXmlData] = useState(null);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'

  const parseXMLResponse = (xmlString) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      
      // Check for parsing errors
      const parserError = xmlDoc.getElementsByTagName('parsererror');
      if (parserError.length > 0) {
        throw new Error('Invalid XML format');
      }

      // Extract bucket metadata
      const bucketName = xmlDoc.getElementsByTagName('Name')[0]?.textContent || 'Unknown Bucket';
      const prefix = xmlDoc.getElementsByTagName('Prefix')[0]?.textContent || '';
      const maxKeys = xmlDoc.getElementsByTagName('MaxKeys')[0]?.textContent || '';
      const isTruncated = xmlDoc.getElementsByTagName('IsTruncated')[0]?.textContent === 'true';

      // Extract files/objects from Contents
      const contents = xmlDoc.getElementsByTagName('Contents');
      let fileList = [];
      
      for (let content of contents) {
        const key = content.getElementsByTagName('Key')[0]?.textContent || '';
        const size = content.getElementsByTagName('Size')[0]?.textContent || '0';
        const lastModified = content.getElementsByTagName('LastModified')[0]?.textContent || '';
        const etag = content.getElementsByTagName('ETag')[0]?.textContent || '';
        const storageClass = content.getElementsByTagName('StorageClass')[0]?.textContent || '';
        const checksumAlgorithm = content.getElementsByTagName('ChecksumAlgorithm')[0]?.textContent || '';
        
        // Owner information
        const ownerElement = content.getElementsByTagName('Owner')[0];
        let owner = null;
        if (ownerElement) {
          const id = ownerElement.getElementsByTagName('ID')[0]?.textContent || '';
          const displayName = ownerElement.getElementsByTagName('DisplayName')[0]?.textContent || '';
          owner = { id, displayName };
        }
        
        if (key) {
          fileList.push({
            name: key,
            size: parseInt(size),
            lastModified: lastModified,
            etag: etag.replace(/"/g, ''),
            storageClass: storageClass,
            checksumAlgorithm: checksumAlgorithm,
            owner: owner,
            type: key.includes('.') ? key.split('.').pop().toUpperCase() : 'FILE'
          });
        }
      }

      return {
        bucketName,
        prefix,
        maxKeys,
        isTruncated,
        files: fileList,
        totalFiles: fileList.length,
        totalSize: fileList.reduce((sum, file) => sum + file.size, 0)
      };
    } catch (err) {
      throw new Error(`Failed to parse XML: ${err.message}`);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getFileIcon = (type) => {
    const iconClass = "h-5 w-5";
    switch (type.toLowerCase()) {
      case 'pdf': return <FileText className={`${iconClass} text-red-400`} />;
      case 'docx': case 'doc': return <FileText className={`${iconClass} text-blue-400`} />;
      case 'txt': return <FileText className={`${iconClass} text-gray-400`} />;
      case 'jpg': case 'jpeg': case 'png': case 'gif': return <FileText className={`${iconClass} text-purple-400`} />;
      default: return <FileText className={`${iconClass} text-gray-400`} />;
    }
  };

  const getStorageClassColor = (storageClass) => {
    switch (storageClass) {
      case 'STANDARD': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'STANDARD_IA': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'GLACIER': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'DEEP_ARCHIVE': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault?.();
    if (!url.trim()) return;

    setLoading(true);
    setError('');
    setXmlData(null);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const xmlText = await response.text();
      const parsedData = parseXMLResponse(xmlText);
      setXmlData(parsedData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // New function to filter and sort files
  const getFilteredAndSortedFiles = () => {
    if (!xmlData || !xmlData.files) return [];
    
    let filteredFiles = xmlData.files;
    
    // Apply search filter if query exists
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredFiles = filteredFiles.filter(file => 
        file.name.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting by upload date (lastModified)
    filteredFiles = [...filteredFiles].sort((a, b) => {
      const dateA = new Date(a.lastModified || 0);
      const dateB = new Date(b.lastModified || 0);
      
      if (sortOrder === 'asc') {
        return dateA - dateB;
      } else {
        return dateB - dateA;
      }
    });
    
    return filteredFiles;
  };
  
  // Toggle sort order function
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
      {/* Header */}
      <div className="bg-gray-900/90 backdrop-blur-sm shadow-2xl border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
              <Folder className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                S3 Bucket Explorer
              </h1>
              <p className="text-gray-400 mt-1">Advanced XML bucket content viewer with metadata</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* URL Input Form */}
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-800 p-6 mb-8">
          <div className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-semibold text-gray-300 mb-2">
                API Endpoint URL
              </label>
              <div className="relative">
                <input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://s3.amazonaws.com/your-bucket"
                  className="w-full px-4 py-3 pr-12 bg-gray-800/50 border border-gray-700 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                />
                <Search className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading || !url.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Fetching...</span>
                </>
              ) : (
                <>
                  <Search className="h-5 w-5" />
                  <span>Fetch Bucket Data</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 mb-8 backdrop-blur-sm">
            <div className="flex items-center space-x-2">
              <div className="h-5 w-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <p className="text-red-300 font-medium">Error: {error}</p>
            </div>
          </div>
        )}

        {/* Results Display */}
        {xmlData && (
          <div className="space-y-6">
            {/* Bucket Info */}
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                    <Folder className="h-5 w-5 text-white" />
                  </div>
                  <span>{xmlData.bucketName}</span>
                </h2>
                <div className="flex space-x-4 text-sm text-gray-400">
                  <div className="flex items-center space-x-1">
                    <FileText className="h-4 w-4" />
                    <span>{xmlData.totalFiles} files</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Download className="h-4 w-4" />
                    <span>{formatFileSize(xmlData.totalSize)}</span>
                  </div>
                  {xmlData.isTruncated && (
                    <div className="flex items-center space-x-1">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                        Truncated
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Bucket Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {xmlData.maxKeys && (
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <div className="text-gray-400 text-sm">Max Keys</div>
                    <div className="text-white font-semibold">{xmlData.maxKeys}</div>
                  </div>
                )}
                {xmlData.prefix && (
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <div className="text-gray-400 text-sm">Prefix</div>
                    <div className="text-white font-semibold">{xmlData.prefix}</div>
                  </div>
                )}
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <div className="text-gray-400 text-sm">Status</div>
                  <div className="text-green-400 font-semibold">Active</div>
                </div>
              </div>
            </div>

            {/* Files List */}
            {xmlData.files.length > 0 ? (
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-800 overflow-hidden">
                <div className="px-6 py-4 bg-gray-800/50 border-b border-gray-700">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="text-lg font-semibold text-white">Objects in Bucket</h3>
                    
                    {/* Search and Sort Controls */}
                    <div className="flex flex-col md:flex-row gap-3">
                      {/* Search Bar */}
                      <div className="relative w-full md:w-64">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search files..."
                          className="w-full px-4 py-2 pr-10 bg-gray-800/50 border border-gray-700 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        />
                        <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                      </div>
                      
                      {/* Sort Button */}
                      <button 
                        onClick={toggleSortOrder}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg hover:bg-gray-700/50 transition-all duration-200"
                      >
                        <span className="text-sm text-gray-300">Date</span>
                        {sortOrder === 'asc' ? (
                          <SortAsc className="h-4 w-4 text-gray-400" />
                        ) : (
                          <SortDesc className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-gray-800">
                  {getFilteredAndSortedFiles().map((file, index) => (
                    <div key={index} className="px-6 py-5 hover:bg-gray-800/30 transition-all duration-200 group">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className="flex-shrink-0 mt-1">
                            <div className="h-10 w-10 bg-gray-800/50 rounded-lg flex items-center justify-center border border-gray-700">
                              {getFileIcon(file.type)}
                            </div>
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <p className="text-white font-medium group-hover:text-blue-300 transition-colors truncate">
                              {file.name}
                            </p>
                            
                            <div className="flex flex-wrap items-center gap-3 mt-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getStorageClassColor(file.storageClass)}`}>
                                {file.storageClass || 'STANDARD'}
                              </span>
                              
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-700/50 text-gray-300 border border-gray-600">
                                {file.type}
                              </span>
                              
                              <span className="text-xs text-gray-400 flex items-center space-x-1">
                                <Download className="h-3 w-3" />
                                <span>{formatFileSize(file.size)}</span>
                              </span>
                              
                              {file.lastModified && (
                                <span className="text-xs text-gray-400 flex items-center space-x-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>{formatDate(file.lastModified)}</span>
                                </span>
                              )}
                              
                              {file.checksumAlgorithm && (
                                <span className="text-xs text-gray-400 flex items-center space-x-1">
                                  <Hash className="h-3 w-3" />
                                  <span>{file.checksumAlgorithm}</span>
                                </span>
                              )}
                            </div>
                            
                            {file.owner && (
                              <div className="mt-2 text-xs text-gray-500 flex items-center space-x-1">
                                <User className="h-3 w-3" />
                                <span>Owner: {file.owner.id.substring(0, 8)}...</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {file.etag && (
                          <div className="flex-shrink-0 ml-4">
                            <div className="text-xs text-gray-500 font-mono bg-gray-800/30 px-2 py-1 rounded border border-gray-700">
                              ETag: {file.etag.substring(0, 12)}...
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* No results message */}
                  {getFilteredAndSortedFiles().length === 0 && (
                    <div className="p-8 text-center">
                      <p className="text-gray-400">No files found matching your search.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-800 p-12 text-center">
                <div className="p-4 bg-gray-800/30 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <Folder className="h-10 w-10 text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No Objects Found</h3>
                <p className="text-gray-400">This bucket appears to be empty or the XML format is not recognized.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}