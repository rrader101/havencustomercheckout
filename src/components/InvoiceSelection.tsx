import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronUp, Receipt, Calendar, DollarSign } from 'lucide-react';
import { Invoice, Deal } from '@/services/api';

const phpRound = (value: number, precision: number = 2): string => {
  const factor = Math.pow(10, precision);
  return (Math.floor(value * factor) / factor).toFixed(precision);
};

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
  const [changeView, setChangeView] = useState(false);

 const toggleInvoice = (invoiceId: string) => {
  const selectableIds = availableInvoices
    .filter((inv) => !isInvoicePaid(inv.status))
    .map((inv) => inv.id.toString());

  const currentlySelectedIds = selectableIds.filter((id) => !!data[id]);
  const isCurrentlySelected = !!data[invoiceId];

  // For Subscription type, allow unselecting all invoices
  // For other types (One Time), require at least one invoice to be selected
  if (isCurrentlySelected && currentlySelectedIds.length === 1 && deal?.type !== 'Subscription') {
    return; // do nothing (must keep at least one selected for non-subscription deals)
  }

  onUpdate({ [invoiceId]: !isCurrentlySelected });
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
      <Card className={`${isOrderSummary ? 'p-4' : 'p-6'} border-0 bg-card`}>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading invoices...</p>
        </div>
      </Card>
    );
  }

  if (isOrderSummary) {
    return (
        <div className="space-y-4">

      {/* Invoice List */}
      <div className="space-y-4">
        {availableInvoices.map((invoice) => {
          const invoiceKey = invoice.id.toString()
          const isPaid = isInvoicePaid(invoice.status)
          const isSelected = data[invoiceKey]
          const isDisabled = isPaid

          return (
            <div
              key={invoice.id}
              className="bg-white border-2 border-primary/20 rounded-xl hover:shadow-lg overflow-hidden"
            >
              {/* Main Invoice Row */}
              <div
                className={`
                    p-4 cursor-pointer relative
                    ${isDisabled 
                      ? 'bg-gray-50 cursor-not-allowed opacity-60' 
                      : isSelected 
                        ? 'text-white' 
                        : 'bg-gray-100 hover:bg-gray-200'
                    }
                  `}
                onClick={() => !isDisabled && toggleInvoice(invoiceKey)}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  {!isDisabled && (
                      <div className={`
                        w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 mt-1
                        ${isSelected 
                          ? 'bg-primary border-primary' 
                          : 'border-primary/20 hover:border-primary'
                        }
                      `}>
                        {isSelected && (
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        )}
                      </div>
                    )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold text-foreground max-w-[185px] break-words whitespace-normal">#{invoice.invoice_num}</p>
                        <p className="text-xs text-muted-foreground mt-1">Due: {formatDate(invoice.due_date)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-foreground">
                          ${phpRound(Number.parseFloat(invoice.amount))}
                        </p>
                      </div>
                    </div>

                    {/* Status and Toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Status: {invoice.status.replace(/\b\w/g, (c) => c.toUpperCase())}
                        </p>
                      </div>

                      {/* Expand Button */}
                    <div className="text-right">
                          {/* Enhanced Collapsible Toggle - moved below price */}
                          {invoice.invoice_products.length > 0 && (
                            <div className="flex justify-end mt-1">
                              <button
                                onClick={(e) => toggleDetails(invoiceKey, e)}
                                className="p-1 hover:bg-white rounded-lg transition-colors duration-200 flex items-center justify-center border border-gray-300"
                              >
                                {expandedDetails[invoiceKey] ? (
                                  <ChevronUp className="w-4 h-4 text-black" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-black" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Collapsible Product Details */}
              {expandedDetails[invoiceKey] && invoice.invoice_products.length > 0 && (
                <div className="border-t border-border bg-muted/20 p-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">
                    Invoice Details
                  </p>

                  <div className="space-y-2">
                    {/* Header Row */}
                    <div className="grid grid-cols-3 gap-3 px-3 py-2 text-xs font-semibold text-muted-foreground">
                      <div>Product</div>
                      <div className="text-center">Qty</div>
                      <div className="text-right">Price</div>
                    </div>

                    {/* Product Rows */}
                    {invoice.invoice_products.map((product, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-3 gap-3 px-3 py-2.5 bg-card rounded-md border border-border/50 text-xs"
                      >
                        <div className="text-foreground truncate">{product.name}</div>
                        <div className="text-center text-muted-foreground">{product.quantity}</div>
                        <div className="text-right text-foreground">
                          ${phpRound(Number.parseFloat(product.price))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {availableInvoices.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-border rounded-lg bg-muted/30">
          <Receipt className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground">No invoices available</p>
          <p className="text-xs text-muted-foreground mt-1">Check back later for new invoices</p>
        </div>
      )}
    </div>
    );
  }


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
          return (
            <div key={invoice.id} className="bg-white rounded-xl border border-gray-200 shadow-lg hover:shadow-xl">
              {/* Enhanced Header */}
              <div className="bg-primary text-primary-foreground px-6 py-4">
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
                    grid grid-cols-5 gap-3 items-center p-3 rounded-xl cursor-pointer border-2
                    ${isDisabled 
                      ? 'bg-gray-50 cursor-not-allowed opacity-60 border-gray-200' 
                      : isSelected 
                        ? 'bg-primary border-primary shadow-md text-primary-foreground' 
                        : 'hover:bg-gray-50 border-gray-200 hover:border-gray-300'
                    }
                  `}
                  onClick={() => !isDisabled && toggleInvoice(invoiceKey)}
                >
                  <div className="flex items-center gap-2">
                    {!isDisabled && (
                      <div className={`
                        w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200
                        ${isSelected 
                          ? 'bg-primary border-primary' 
                          : 'border-primary/20 hover:border-primary'
                        }
                      `}>
                        {isSelected && (
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        )}
                      </div>
                    )}
                    <span className="font-medium text-xs text-gray-700">{invoice.invoice_num}</span>
                  </div>
                  <div className="text-gray-500 font-medium">-</div>
                  <div>
                    <span className={`
                      inline-flex px-2 py-1 text-xs font-normal
                      ${isPaid
                        ? 'rounded-full bg-green-100 text-green-700'
                        : 'rounded-md border border-gray-300 text-gray-700 bg-white'
                      }
                    `}>
                      {isPaid ? 'Paid' : 'Awaiting Payment'}
                    </span>
                  </div>
                  <div className="font-medium text-xs text-gray-600">{formatDate(invoice.due_date)}</div>
                  <div className="font-semibold text-xs text-gray-900">${phpRound(parseFloat(invoice.amount))}</div>
                </div>

                {/* Enhanced Collapsible Invoice Details */}
                {invoice.invoice_products.length > 0 && (
                  <div className="mt-6">
                    <button
                      onClick={(e) => toggleDetails(invoiceKey, e)}
                      className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-gray-800 transition-colors bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg"
                    >
                      {expandedDetails[invoiceKey] ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                      Invoice Details
                    </button>
                    
                    {expandedDetails[invoiceKey] && (
                      <div className="mt-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
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
                            <div className="text-right font-bold text-gray-900">${phpRound(parseFloat(product.price))}</div>
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
          return (
            <div 
              key={invoice.id}
              className={`
                relative p-6 rounded-xl border-2 cursor-pointer group shadow-sm hover:shadow-lg
                ${isDisabled 
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' 
                  : isSelected
                    ? 'border-blue-300 bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md text-white' 
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }
              `}
              onClick={() => !isDisabled && toggleInvoice(invoiceKey)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`p-3 rounded-xl border-2 ${
                      isSelected ? 'bg-blue-500 border-blue-300 text-white' : 'bg-gray-100 border-gray-200'
                    }`}>
                      <Receipt className={`w-6 h-6 ${
                        isSelected ? 'text-white' : 'text-gray-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Invoice #{invoice.invoice_num}</h3>
                      <div className="text-lg font-bold text-white">${phpRound(parseFloat(invoice.amount))}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 mb-4 text-sm">
                    <div className="flex items-center text-gray-600">
                      <span className="font-medium">Due: {formatDate(invoice.due_date)}</span>
                    </div>
                    <div className="flex items-center">
                      <span className={`
                        inline-flex px-2 py-1 text-xs font-normal
                        ${isPaid
                          ? 'rounded-full bg-green-100 text-green-700'
                          : invoice.status.toLowerCase() === 'awaiting payment'
                            ? 'rounded-md border border-gray-300 text-gray-700 bg-white'
                            : 'rounded-full bg-amber-100 text-amber-700'
                        }
                      `}>
                        {invoice.status.replace(/\b\w/g, (c) => c.toUpperCase())}
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
                        <div className="mt-3 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
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
                                <span className="font-bold text-gray-900">${phpRound(parseFloat(product.price))}</span>
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
                  absolute top-6 right-6 w-7 h-7 rounded-full border-2 shadow-sm
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
          className="px-8 py-3 bg-black text-white rounded-lg font-medium hover:bg-primary-hover transition-colors"
        >
          Continue to Payment →
        </button>
      </div>
    </div>
  );
};

export default InvoiceSelection;