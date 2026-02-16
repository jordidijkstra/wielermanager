import React from 'react';

export default function RiderTable({
  columns,
  data,
  sortConfig,
  onSort,
  pagination,
  onPageChange,
  rowClassName,
  isLoading
}) {
  if (isLoading) {
    return <div className="table-loading">Data laden...</div>;
  }

  // Calculate pages for windowed pagination
  const getPageNumbers = () => {
    if (!pagination || pagination.totalPages <= 1) return [];
    
    const { current, totalPages } = pagination;
    const delta = 2; // Number of pages to show on each side of current
    const range = [];
    const rangeWithDots = [];

    range.push(1);
    for (let i = current - delta; i <= current + delta; i++) {
        if (i > 1 && i < totalPages) {
            range.push(i);
        }
    }
    if (totalPages > 1) {
        range.push(totalPages);
    }

    let l;
    for (let i of range) {
        if (l) {
            if (i - l === 2) {
                rangeWithDots.push(l + 1);
            } else if (i - l !== 1) {
                rangeWithDots.push('...');
            }
        }
        rangeWithDots.push(i);
        l = i;
    }
    return rangeWithDots;
  };

  return (
    <div className="riders-table-container">
      <table className="riders-table">
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th
                key={col.key || index}
                onClick={() => col.sortable && onSort && onSort(col.key)}
                className={col.className || ''}
                style={{
                  cursor: col.sortable ? 'pointer' : 'default',
                  backgroundColor: sortConfig && sortConfig.field === col.key ? '#f0f0f0' : 'transparent',
                  ...col.headerStyle
                }}
              >
                {col.label}
                {sortConfig && sortConfig.field === col.key && (
                  <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                )}
              </th>
            ))}
          </tr>
          {sortConfig && (
             <tr style={{backgroundColor: '#fafafa', borderTop: '2px solid #ddd'}}>
                <td colSpan={columns.length} style={{textAlign: 'center', padding: '8px', fontSize: '12px', color: '#666'}}>
                  Sorteren op: <strong>{columns.find(c => c.key === sortConfig.field)?.label || sortConfig.field}</strong> ({sortConfig.direction === 'asc' ? 'oplopend' : 'aflopend'})
                  {onSort && (
                    <button onClick={() => onSort(sortConfig.field)} style={{marginLeft: '10px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '3px'}}>
                        Richting omdraaien
                    </button>
                  )}
                </td>
             </tr>
          )}
        </thead>
        <tbody>
          {!data || data.length === 0 ? (
             <tr>
               <td colSpan={columns.length} className="no-data" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                 Geen gegevens gevonden
               </td>
             </tr>
          ) : (
            data.map((item, rowIndex) => (
            <tr key={item.id || rowIndex} className={rowClassName ? rowClassName(item) : ''}>
              {columns.map((col, colIndex) => (
                <td key={`${item.id || rowIndex}-${col.key || colIndex}`} className={col.cellClassName || ''} style={col.cellStyle}>
                  {col.render ? col.render(item, rowIndex) : item[col.key]}
                </td>
              ))}
            </tr>
          ))
          )}
        </tbody>
        {pagination && pagination.totalPages > 1 && (
          <tfoot>
            <tr>
              <td colSpan={columns.length}>
                <div className="pagination-riders">
                  <button 
                    onClick={() => onPageChange(pagination.current - 1)} 
                    disabled={pagination.current === 1}
                    style={{ padding: '8px 12px', margin: '0 4px', cursor: 'pointer', opacity: pagination.current === 1 ? 0.5 : 1 }}
                  >
                    &laquo;
                  </button>
                  
                  {getPageNumbers().map((pageNum, idx) => (
                    pageNum === '...' ? (
                        <span key={`dots-${idx}`} style={{ padding: '8px 4px' }}>...</span>
                    ) : (
                        <button
                        key={pageNum}
                        onClick={() => onPageChange(pageNum)}
                        style={{
                            padding: '8px 12px',
                            margin: '0 4px',
                            background: pagination.current === pageNum ? '#fca311' : '#fff',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: pagination.current === pageNum ? 'bold' : 'normal'
                        }}
                        >
                        {pageNum}
                        </button>
                    )
                  ))}

                  <button 
                    onClick={() => onPageChange(pagination.current + 1)} 
                    disabled={pagination.current === pagination.totalPages}
                    style={{ padding: '8px 12px', margin: '0 4px', cursor: 'pointer', opacity: pagination.current === pagination.totalPages ? 0.5 : 1 }}
                  >
                    &raquo;
                  </button>
                </div>
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
