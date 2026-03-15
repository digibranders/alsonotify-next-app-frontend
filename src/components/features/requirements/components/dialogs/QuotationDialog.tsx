'use client';

import { useState } from 'react';
import { Modal, Input, App, Select, Space, Checkbox, DatePicker } from 'antd';
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
    if (requiresAdvance) {
      if (!advanceAmount || parseFloat(advanceAmount) <= 0) {
        messageApi.error("Please enter a valid advance amount");
        return;
      }
      if (!advanceDueDate) {
        messageApi.error("Please select a payment due date");
        return;
      }
      const totalCost = pricingModel === 'hourly'
        ? parseFloat(rate) * parseFloat(hours)
        : parseFloat(amount);
      if (parseFloat(advanceAmount) > totalCost) {
        messageApi.error("Advance amount cannot exceed total cost");
        return;
      }
    }

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
      advance_amount: requiresAdvance ? parseFloat(advanceAmount) : undefined,
      advance_payment_due_date: requiresAdvance ? advanceDueDate : undefined,
    });
    onOpenChange(false);
  };

  const currencySelector = (
    <Select value={currency} onChange={setCurrency} style={{ width: 80 }} variant="borderless" className="currency-select-addon">
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
                <Space.Compact className="w-full quotation-dialog-currency">
                  {currencySelector}
                  <Input
                    type="number"
                    placeholder="0.00"
                    className="h-11 rounded-lg bg-white"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                  />
                </Space.Compact>
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
              <Space.Compact className="w-full quotation-dialog-currency">
                {currencySelector}
                <Input
                  type="number"
                  placeholder="0.00"
                  className="h-11 rounded-lg bg-white"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </Space.Compact>
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

            {requiresAdvance && (
              <div className="mt-3 space-y-3 pl-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#111111]">Advance Amount</label>
                  <Space.Compact className="w-full quotation-dialog-currency">
                    {currencySelector}
                    <Input
                      type="number"
                      placeholder="0.00"
                      className="h-11 rounded-lg bg-white"
                      value={advanceAmount}
                      onChange={(e) => setAdvanceAmount(e.target.value)}
                    />
                  </Space.Compact>
                </div>
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
            )}
          </div>
        </div>
      </Modal>
      <style jsx global>{`
          .quotation-dialog-currency .currency-select-addon .ant-select-selector {
            background-color: white !important;
            border: 1px solid #d9d9d9 !important;
            border-right: 0 !important;
            border-radius: 8px 0 0 8px !important;
            height: 44px !important;
            display: flex !important;
            align-items: center !important;
            box-shadow: none !important;
            font-weight: 500 !important;
          }

          .quotation-dialog-currency .ant-input {
             border: 1px solid #d9d9d9 !important;
             border-left: 0 !important;
             border-radius: 0 8px 8px 0 !important;
          }

          .quotation-dialog-currency:focus-within .currency-select-addon .ant-select-selector {
             border-color: #111111 !important;
          }

          .quotation-dialog-currency:focus-within .ant-input {
             border-color: #111111 !important;
          }

          .quotation-dialog-currency {
             display: flex !important;
             border-radius: 8px !important;
             overflow: hidden !important;
          }

          .quotation-dialog-currency .currency-select-addon {
             display: flex !important;
             align-items: center !important;
          }
      `}</style>
    </>
  );
}
