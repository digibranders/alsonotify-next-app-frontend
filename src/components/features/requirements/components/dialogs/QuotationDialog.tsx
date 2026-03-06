'use client';

import { useState, useEffect } from 'react';
import { Modal, Input, App, Select, Space } from 'antd';

const { Option } = Select;

interface QuotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: { cost?: number; rate?: number; hours?: number; currency: string }) => void;
  pricingModel?: 'hourly' | 'project';
}

/**
 * Dialog for submitting quotations for requirements.
 * Supports both hourly and project-based pricing models.
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

  const [prevOpen, setPrevOpen] = useState(open);
  if (open && !prevOpen) {
    setPrevOpen(open);
    setAmount('');
    setRate('');
    setHours('');
    setCurrency('USD');
  } else if (!open && prevOpen) {
    setPrevOpen(open);
  }

  const handleConfirm = () => {
    if (pricingModel === 'hourly') {
      if (!rate || !hours) {
        messageApi.error("Please enter rate and hours");
        return;
      }
      onConfirm({
        rate: parseFloat(rate),
        hours: parseFloat(hours),
        cost: parseFloat(rate) * parseFloat(hours),
        currency
      });
    } else {
      if (!amount) {
        messageApi.error("Please enter an amount");
        return;
      }
      onConfirm({
        cost: parseFloat(amount),
        currency
      });
    }
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
        width="min(400px, 95vw)"
        centered
      >
        <div className="space-y-4 py-4">
          <p className="text-[0.8125rem] text-[#666666] font-normal">
            Please provide the final quotation details for this {pricingModel === 'hourly' ? 'hourly' : 'project'} requirement.
          </p>
          {pricingModel === 'hourly' ? (
            <>
              <div className="space-y-2">
                <label className="text-[0.8125rem] font-bold text-[#111111]">Confirmed Hourly Rate</label>
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
                <label className="text-[0.8125rem] font-bold text-[#111111]">Estimated Hours</label>
                <Input
                  type="number"
                  placeholder="0"
                  className="h-11 rounded-lg"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />
              </div>
              <div className="pt-2 border-t border-[#EEEEEE] flex justify-between items-center">
                <span className="text-[0.8125rem] font-bold text-[#111111]">Total Estimated:</span>
                <span className="text-base font-bold text-[#ff3b3b]">
                  {currency} {((parseFloat(rate) || 0) * (parseFloat(hours) || 0)).toFixed(2)}
                </span>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <label className="text-[0.8125rem] font-bold text-[#111111]">Total Project Cost</label>
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
