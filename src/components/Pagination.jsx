import PropTypes from 'prop-types';

export default function Pagination({ 
  currentPage, 
  totalPages, 
  onGoToPage, 
  onPrevPage, 
  onNextPage,
  maxVisiblePages = 7,
  className = ''
}) {
  const getPaginationPages = () => {
    const pages = [];
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage <= 4) {
        for (let i = 2; i <= 5; i++) pages.push(i);
        pages.push('...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push('...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className={`pagination ${className}`}>
      <button 
        className="pagination-btn"
        onClick={onPrevPage}
        disabled={currentPage === 1}
        aria-label="Vorige pagina"
      >
        <i className="fas fa-chevron-left"></i>
      </button>
      
      <div className="pagination-pages">
        {getPaginationPages().map((page, index) => (
          page === '...' ? (
            <span key={`ellipsis-${index}`} className="pagination-ellipsis">
              ...
            </span>
          ) : (
            <button
              key={page}
              className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
              onClick={() => onGoToPage(page)}
              aria-current={currentPage === page ? 'page' : undefined}
              aria-label={`Ga naar pagina ${page}`}
            >
              {page}
            </button>
          )
        ))}
      </div>

      <button 
        className="pagination-btn"
        onClick={onNextPage}
        disabled={currentPage === totalPages}
        aria-label="Volgende pagina"
      >
        <i className="fas fa-chevron-right"></i>
      </button>
    </div>
  );
}

Pagination.propTypes = {
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  onGoToPage: PropTypes.func.isRequired,
  onPrevPage: PropTypes.func.isRequired,
  onNextPage: PropTypes.func.isRequired,
  maxVisiblePages: PropTypes.number,
  className: PropTypes.string
};
