'use client';

import { useState } from 'react';
import { Modal, Input, App, Select, Checkbox, DatePicker } from 'antd';
import dayjs from 'dayjs';

const { Option } = Select;

interface QuotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: {
    cost?: number;
    rate?: number;
    hours?: number;
    currency: string;
    requires_advance_payment?: boolean;
    advance_amount?: number;
    advance_payment_due_date?: string;
  }) => void;
  pricingModel?: 'hourly' | 'project';
}

/**
 * Dialog for submitting quotations for requirements.
 * Supports both hourly and project-based pricing models.
 * Optionally allows vendor to require advance payment before work starts.
 */
export function QuotationDialog({
  open,
  onOpenChange,
  onConfirm,
  pricingModel
}: QuotationDialogProps) {
  const { message: messageApi } = App.useApp();
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [hours, setHours] = useState('');
  const [currency, setCurrency] = useState('USD');

  // Advance payment fields
  const [requiresAdvance, setRequiresAdvance] = useState(false);
  const [advanceType, setAdvanceType] = useState<'percentage' | 'flat'>('percentage');
  const [advancePercentage, setAdvancePercentage] = useState<number>(50);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceDueDate, setAdvanceDueDate] = useState('');

  const [prevOpen, setPrevOpen] = useState(open);
  if (open && !prevOpen) {
    setPrevOpen(open);
    setAmount('');
    setRate('');
    setHours('');
    setCurrency('USD');
    setRequiresAdvance(false);
    setAdvanceType('percentage');
    setAdvancePercentage(50);
    setAdvanceAmount('');
    setAdvanceDueDate('');
  } else if (!open && prevOpen) {
    setPrevOpen(open);
  }

  const handleConfirm = () => {
    if (pricingModel === 'hourly') {
      if (!rate || !hours) {
        messageApi.error("Please enter rate and hours");
        return;
      }
    } else {
      if (!amount) {
        messageApi.error("Please enter an amount");
        return;
      }
    }

    // Validate advance payment fields
    const totalCost = pricingModel === 'hourly'
      ? parseFloat(rate) * parseFloat(hours)
      : parseFloat(amount);

    if (requiresAdvance) {
      const computedAdvance = advanceType === 'percentage'
        ? (totalCost * advancePercentage) / 100
        : parseFloat(advanceAmount);

      if (!computedAdvance || computedAdvance <= 0) {
        messageApi.error("Please enter a valid advance amount");
        return;
      }
      if (!advanceDueDate) {
        messageApi.error("Please select a payment due date");
        return;
      }
      if (computedAdvance > totalCost) {
        messageApi.error("Advance amount cannot exceed total cost");
        return;
      }
    }

    const computedAdvanceAmount = requiresAdvance
      ? (advanceType === 'percentage'
        ? (totalCost * advancePercentage) / 100
        : parseFloat(advanceAmount))
      : undefined;

    const baseData = pricingModel === 'hourly'
      ? {
          rate: parseFloat(rate),
          hours: parseFloat(hours),
          cost: parseFloat(rate) * parseFloat(hours),
          currency,
        }
      : {
          cost: parseFloat(amount),
          currency,
        };

    onConfirm({
      ...baseData,
      requires_advance_payment: requiresAdvance,
      advance_amount: computedAdvanceAmount,
      advance_payment_due_date: requiresAdvance ? advanceDueDate : undefined,
    });
    onOpenChange(false);
  };

  const currencySelector = (
    <Select value={currency} onChange={setCurrency} style={{ width: 80 }} className="currency-select-addon">
      <Option value="USD">USD</Option>
      <Option value="EUR">EUR</Option>
      <Option value="GBP">GBP</Option>
      <Option value="INR">INR</Option>
      <Option value="AED">AED</Option>
    </Select>
  );

  return (
    <>
      <Modal
        open={open}
        onCancel={() => onOpenChange(false)}
        onOk={handleConfirm}
        title="Submit Quotation"
        okText="Send Quotation"
        cancelText="Cancel"
        okButtonProps={{ className: 'bg-[#111111] hover:bg-[#000000]/90' }}
        width="min(440px, 95vw)"
        centered
      >
        <div className="space-y-4 py-4">
          <p className="text-xs text-[#666666] font-medium">
            Please provide the final quotation details for this {pricingModel === 'hourly' ? 'hourly' : 'project'} requirement.
          </p>
          {pricingModel === 'hourly' ? (
            <>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111111]">Confirmed Hourly Rate</label>
                <div className="w-full split-input-group">
                  {currencySelector}
                  <Input
                    type="number"
                    placeholder="0.00"
                    className="h-11 bg-white"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#111111]">Estimated Hours</label>
                <Input
                  type="number"
                  placeholder="0"
                  className="h-11 rounded-lg"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />
              </div>
              <div className="pt-2 border-t border-[#EEEEEE] flex justify-between items-center">
                <span className="text-xs font-bold text-[#111111]">Total Estimated:</span>
                <span className="text-base font-bold text-[#ff3b3b]">
                  {currency} {((parseFloat(rate) || 0) * (parseFloat(hours) || 0)).toFixed(2)}
                </span>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#111111]">Total Project Cost</label>
              <div className="w-full split-input-group">
                {currencySelector}
                <Input
                  type="number"
                  placeholder="0.00"
                  className="h-11 bg-white"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Advance Payment Section */}
          <div className="pt-4 border-t border-[#EEEEEE]">
            <Checkbox
              checked={requiresAdvance}
              onChange={(e) => setRequiresAdvance(e.target.checked)}
            >
              <span className="text-xs font-bold text-[#111111]">
                Require advance payment before work starts
              </span>
            </Checkbox>

            {requiresAdvance && (() => {
              const total = pricingModel === 'hourly'
                ? (parseFloat(rate) || 0) * (parseFloat(hours) || 0)
                : (parseFloat(amount) || 0);
              const computedAdvance = advanceType === 'percentage'
                ? (total * advancePercentage) / 100
                : (parseFloat(advanceAmount) || 0);

              return (
                <div className="mt-3 space-y-3 pl-6">
                  {/* Percentage / Flat toggle */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAdvanceType('percentage')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                        advanceType === 'percentage'
                          ? 'bg-[#111111] text-white border-[#111111]'
                          : 'bg-white text-[#666666] border-[#EEEEEE] hover:border-[#111111]'
                      }`}
                    >
                      Percentage
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdvanceType('flat')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                        advanceType === 'flat'
                          ? 'bg-[#111111] text-white border-[#111111]'
                          : 'bg-white text-[#666666] border-[#EEEEEE] hover:border-[#111111]'
                      }`}
                    >
                      Flat Amount
                    </button>
                  </div>

                  {advanceType === 'percentage' ? (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#111111]">Advance Percentage</label>
                      <div className="flex gap-1.5">
                        {[25, 50, 75, 100].map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setAdvancePercentage(p)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                              advancePercentage === p
                                ? 'bg-[#111111] text-white border-[#111111]'
                                : 'bg-[#F9FAFB] text-[#666666] border-[#EEEEEE] hover:border-[#111111]'
                            }`}
                          >
                            {p}%
                          </button>
                        ))}
                      </div>
                      {total > 0 && (
                        <p className="text-xs text-[#666666]">
                          = {currency} {computedAdvance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} of {currency} {total.toLocaleString()}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#111111]">Advance Amount</label>
                      <div className="w-full split-input-group">
                        {currencySelector}
                        <Input
                          type="number"
                          placeholder="0.00"
                          className="h-11 bg-white"
                          value={advanceAmount}
                          onChange={(e) => setAdvanceAmount(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#111111]">Payment Due Date</label>
                    <DatePicker
                      value={advanceDueDate ? dayjs(advanceDueDate) : null}
                      onChange={(d) => setAdvanceDueDate(d ? d.format('YYYY-MM-DD') : '')}
                      className="w-full h-11 rounded-lg"
                      format="MMM D, YYYY"
                      disabledDate={(current) => current && current < dayjs().startOf('day')}
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </Modal>
    </>
  );
}
