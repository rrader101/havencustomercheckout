import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronUp, Receipt, Calendar, DollarSign } from 'lucide-react';
import { Invoice, Deal } from '@/services/api';

interface InvoiceSelectionProps {
  data: Record<string, boolean>;
  onUpdate: (data: Partial<Record<string, boolean>>) => void;
  availableInvoices: Invoice[];
  deal?: Deal;
  loading?: boolean;
  onNext?: () => void;
  onBack?: () => void;
  isOrderSummary?: boolean;
}

export const InvoiceSelection = ({ data, onUpdate, availableInvoices, deal, loading, onNext, onBack, isOrderSummary = false }: InvoiceSelectionProps) => {
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});

  const toggleInvoice = (invoiceId: string) => {
    onUpdate({ [invoiceId]: !data[invoiceId] });
  };

  const toggleDetails = (invoiceId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the invoice selection
    setExpandedDetails(prev => ({
      ...prev,
      [invoiceId]: !prev[invoiceId]
    }));
  };

  const isInvoicePaid = (status: string) => {
    return status.toLowerCase() === 'paid';
  };

  const isOneTimeInvoice = (invoice: Invoice) => {
    // Check if deal type is 'One Time'
    return deal?.type === 'One Time';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card className={`${isOrderSummary ? 'p-4' : 'p-6'} border-0 bg-card animate-fade-in`}>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading invoices...</p>
        </div>
      </Card>
    );
  }

  // Compact version for order summary
  if (isOrderSummary) {
    return (
      <div className="space-y-3">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-t-lg shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <h4 className="text-sm font-semibold uppercase tracking-wide">{deal?.type} Plan</h4>
          </div>
        </div>
        
        {/* Invoice List */}
        <div className="space-y-2">
          {availableInvoices.map((invoice) => {
            const invoiceKey = invoice.id.toString();
            const isPaid = isInvoicePaid(invoice.status);
            const isSelected = data[invoiceKey];
            const isDisabled = isPaid;

            return (
              <div key={invoice.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300">
                {/* Main Invoice Row */}
                <div 
                  className={`
                    flex items-center justify-between p-4 cursor-pointer transition-all duration-300 relative
                    ${isDisabled 
                      ? 'bg-gray-50 cursor-not-allowed opacity-60' 
                      : isSelected 
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-l-blue-500' 
                        : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 hover:border-l-4 hover:border-l-indigo-300'
                    }
                  `}
                  onClick={() => !isDisabled && toggleInvoice(invoiceKey)}
                >
                  <div className="flex items-center gap-4">
                    {!isDisabled && (
                      <div className={`
                        w-6 h-6 rounded-lg border-2 transition-all duration-300 flex items-center justify-center shadow-sm
                        ${isSelected 
                          ? 'bg-gradient-to-br from-green-500 to-emerald-600 border-green-500 shadow-green-200' 
                          : 'border-gray-300 hover:border-green-400 hover:shadow-md'
                        }
                      `}>
                        {isSelected && (
                          <div className="w-2.5 h-2.5 bg-white rounded-full drop-shadow-sm" />
                        )}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-bold text-gray-800 tracking-wide">#{invoice.invoice_num}</div>
                      <div className="text-xs text-gray-500">
                        Due: {formatDate(invoice.due_date)}
                      </div>
                      <span className={`
                        text-xs font-semibold
                        ${isPaid 
                          ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200' 
                          : 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 border border-amber-200'
                        }
                      `}>
                        {invoice.status}
                      </span>
                    </div>
                    <div>
                      <div className="text-md font-bold text-gray-800 tracking-tight">${parseFloat(invoice.amount).toFixed(2)}</div>
                      
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    {/* Enhanced Collapsible Toggle */}
                    {invoice.invoice_products.length > 0 && (
                      <button
                        onClick={(e) => toggleDetails(invoiceKey, e)}
                        className="p-2 hover:bg-whiterounded-lg transition-all duration-200"
                      >
                        {expandedDetails[invoiceKey] ? (
                          <ChevronUp className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Enhanced Collapsible Product Details */}
                {expandedDetails[invoiceKey] && invoice.invoice_products.length > 0 && (
                  <div className="border-t border-gray-200 bg-gradient-to-br from-gray-50 to-blue-50 p-4 animate-fade-in">
                    <div className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">📋 Invoice Details</div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3 text-xs font-bold text-gray-600 pb-2 border-b border-gray-300">
                        <div>Product</div>
                        <div className="text-center">Qty</div>
                        <div className="text-right">Price</div>
                      </div>
                      {invoice.invoice_products.map((product, index) => (
                        <div key={index} className="grid grid-cols-3 gap-3 text-xs bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                          <div className="text-gray-800 font-semibold">{product.name}</div>
                          <div className="text-center text-gray-600 font-medium">{product.quantity}</div>
                          <div className="text-right font-bold text-gray-900">${parseFloat(product.price).toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {availableInvoices.length === 0 && (
          <div className="text-center py-8 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border-2 border-dashed border-gray-300">
            <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-sm font-medium text-gray-600">No invoices available</p>
            <p className="text-xs text-gray-500 mt-1">Check back later for new invoices</p>
          </div>
        )}
      </div>
    );
  }

  // Full version for dedicated step
  return (
    <div className="space-y-4">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Receipt className="w-5 h-5 text-foreground" />
          <h3 className="text-lg font-semibold text-foreground" style={{ fontWeight: 700, fontSize: '1.4rem', letterSpacing: '-0.02rem' }}>Select Invoices</h3>
        </div>
        
        <p className="text-muted-foreground text-sm">Choose which invoices to include in this payment</p>
      </div>

      {availableInvoices.map((invoice) => {
        const invoiceKey = invoice.id.toString();
        const isPaid = isInvoicePaid(invoice.status);
        const isOneTime = isOneTimeInvoice(invoice);
        const isSelected = data[invoiceKey];
        const isDisabled = isPaid;

        if (isOneTime) {
          // Enhanced One Time invoice UI
          return (
            <div key={invoice.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
              {/* Enhanced Header */}
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-6 py-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-base uppercase tracking-wide">INVOICES</h4>
                  <Receipt className="w-5 h-5 opacity-80" />
                </div>
              </div>
              
              {/* Invoice Content */}
              <div className="p-6">
                {/* Enhanced Header Row */}
                <div className="grid grid-cols-5 gap-4 items-center text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200">
                  <div>Invoice #</div>
                  <div>Payment No.</div>
                  <div>Status</div>
                  <div>Due date</div>
                  <div>Total</div>
                </div>
                
                {/* Enhanced Invoice Row */}
                <div 
                  className={`
                    grid grid-cols-5 gap-4 items-center p-4 rounded-xl cursor-pointer transition-all duration-300 border-2
                    ${isDisabled 
                      ? 'bg-gray-50 cursor-not-allowed opacity-60 border-gray-200' 
                      : isSelected 
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 shadow-md' 
                        : 'hover:bg-gray-50 border-gray-200 hover:border-gray-300'
                    }
                  `}
                  onClick={() => !isDisabled && toggleInvoice(invoiceKey)}
                >
                  <div className="flex items-center gap-3">
                    {!isDisabled && (
                      <div className={`
                        w-6 h-6 rounded-full border-2 transition-all duration-300 flex items-center justify-center
                        ${isSelected 
                          ? 'bg-green-500 border-green-500 shadow-lg' 
                          : 'border-gray-300 hover:border-green-400'
                        }
                      `}>
                        {isSelected && (
                          <div className="w-2.5 h-2.5 bg-white rounded-full" />
                        )}
                      </div>
                    )}
                    <span className="font-bold text-gray-900">{invoice.invoice_num}</span>
                  </div>
                  <div className="text-gray-500 font-medium">-</div>
                  <div>
                    <span className={`
                      px-3 py-1.5 text-xs font-bold rounded-full shadow-sm
                      ${isPaid 
                        ? 'bg-green-100 text-green-800 border border-green-200' 
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }
                    `}>
                      {isPaid ? 'Paid' : 'Awaiting Payment'}
                    </span>
                  </div>
                  <div className="font-semibold text-gray-700">{formatDate(invoice.due_date)}</div>
                  <div className="font-bold text-lg text-gray-900">${parseFloat(invoice.amount).toFixed(2)}</div>
                </div>

                {/* Enhanced Collapsible Invoice Details */}
                {invoice.invoice_products.length > 0 && (
                  <div className="mt-6">
                    <button
                      onClick={(e) => toggleDetails(invoiceKey, e)}
                      className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg"
                    >
                      {expandedDetails[invoiceKey] ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                      Invoice Details
                    </button>
                    
                    {expandedDetails[invoiceKey] && (
                      <div className="mt-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 animate-fade-in">
                        <div className="mb-3">
                          <h5 className="text-sm font-bold text-gray-800 mb-2">Product Details</h5>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-300">
                          <div>Product Name</div>
                          <div className="text-center">Quantity</div>
                          <div className="text-right">Price</div>
                        </div>
                        {invoice.invoice_products.map((product, index) => (
                          <div key={index} className="grid grid-cols-3 gap-4 text-sm py-3 border-b border-gray-200 last:border-b-0">
                            <div className="font-medium text-gray-800">{product.name}</div>
                            <div className="text-center text-gray-600 font-medium">{product.quantity}</div>
                            <div className="text-right font-bold text-gray-900">${parseFloat(product.price).toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        } else {
          // Enhanced Regular invoice UI
          return (
            <div 
              key={invoice.id}
              className={`
                relative p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 group shadow-sm hover:shadow-lg
                ${isDisabled 
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' 
                  : isSelected
                    ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md' 
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
                }
              `}
              onClick={() => !isDisabled && toggleInvoice(invoiceKey)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`p-3 rounded-xl border-2 transition-all duration-300 ${
                      isSelected ? 'bg-blue-100 border-blue-300' : 'bg-gray-100 border-gray-200'
                    }`}>
                      <Receipt className={`w-6 h-6 ${
                        isSelected ? 'text-blue-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Invoice #{invoice.invoice_num}</h3>
                      <div className="text-lg font-bold text-blue-600">${parseFloat(invoice.amount).toFixed(2)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 mb-4 text-sm">
                    <div className="flex items-center text-gray-600">
                      <span className="font-medium">Due: {formatDate(invoice.due_date)}</span>
                    </div>
                    <div className="flex items-center">
                      <span className={`
                        px-3 py-1.5 text-xs font-bold rounded-full border
                        ${isPaid 
                          ? 'bg-green-100 text-green-800 border-green-200' 
                          : 'bg-amber-100 text-amber-800 border-amber-200'
                        }
                      `}>
                        {invoice.status}
                      </span>
                    </div>
                  </div>

                  {/* Enhanced Collapsible Product Details */}
                  {invoice.invoice_products.length > 0 && (
                    <div className="mb-3">
                      <button
                        onClick={(e) => toggleDetails(invoiceKey, e)}
                        className="text-gray-600 text-sm font-medium hover:text-gray-800 transition-colors flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg"
                      >
                        {expandedDetails[invoiceKey] ? 'HIDE DETAILS' : 'SHOW DETAILS'}
                        {expandedDetails[invoiceKey] ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      
                      {expandedDetails[invoiceKey] && (
                        <div className="mt-3 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 animate-fade-in">
                          <div className="mb-3">
                            <h5 className="text-sm font-bold text-gray-800">Product Details</h5>
                          </div>
                          <div className="space-y-3">
                            {invoice.invoice_products.map((product, index) => (
                              <div key={index} className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200">
                                <div>
                                  <span className="font-semibold text-gray-800">{product.name}</span>
                                  <span className="text-gray-500 ml-2">(x{product.quantity})</span>
                                </div>
                                <span className="font-bold text-gray-900">${parseFloat(product.price).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Enhanced Selection Indicator */}
              {!isDisabled && (
                <div className={`
                  absolute top-6 right-6 w-7 h-7 rounded-full border-2 transition-all duration-300 shadow-sm
                  ${isSelected 
                    ? 'bg-green-500 border-green-500 shadow-lg' 
                    : 'border-gray-300 group-hover:border-green-400 bg-white'
                  }
                `}>
                  {isSelected && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-2.5 h-2.5 bg-white rounded-full" />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        }
      })}

      {availableInvoices.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No invoices available</p>
        </div>
      )}
      
      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6">
        <button
          onClick={onBack}
          className="px-6 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Add-ons
        </button>
        <button
          onClick={onNext}
          className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Continue to Payment →
        </button>
      </div>
    </div>
  );
};

export default InvoiceSelection;