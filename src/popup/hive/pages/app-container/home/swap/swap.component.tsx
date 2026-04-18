import { setTitleContainerProperties } from '@popup/multichain/actions/title-container.actions';
import {
  setErrorMessage,
  setSuccessMessage,
} from '@popup/multichain/actions/message.actions';
import {
  addToLoadingList,
  removeFromLoadingList,
} from '@popup/multichain/actions/loading.actions';
import { RootState } from '@popup/multichain/store';
import { Screen } from '@reference-data/screen.enum';
import React, { useCallback, useEffect, useState } from 'react';
import { ConnectedProps, connect } from 'react-redux';
import ButtonComponent, {
  ButtonType,
} from 'src/common-ui/button/button.component';
import { OperationButtonComponent } from 'src/common-ui/button/operation-button.component';
import { KeychainKeyTypesLC } from '@interfaces/keychain.interface';
import { SwapEstimate, SwapUtils } from 'src/popup/hive/utils/swap.utils';
import { HiveTxUtils } from 'src/popup/hive/utils/hive-tx.utils';
import { HiveEngineUtils } from 'src/popup/hive/utils/hive-engine.utils';
import { refreshActiveAccount } from 'src/popup/hive/actions/active-account.actions';
import FormatUtils from 'src/utils/format.utils';

type SwapStep = 'form' | 'confirm' | 'success';

const HIVE_ASSETS = ['HIVE', 'HBD'];

const Swap = ({
  activeAccount,
  globalProperties,
  setTitleContainerProperties,
  setErrorMessage,
  setSuccessMessage,
  addToLoadingList,
  removeFromLoadingList,
  refreshActiveAccount,
  userTokens,
}: PropsFromRedux) => {
  const [step, setStep] = useState<SwapStep>('form');
  const [fromAsset, setFromAsset] = useState('HIVE');
  const [toAsset, setToAsset] = useState('HBD');
  const [fromAmount, setFromAmount] = useState('');
  const [estimate, setEstimate] = useState<SwapEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const estimateSeqRef = React.useRef(0);

  useEffect(() => {
    setTitleContainerProperties({
      title: 'popup_html_swap',
      isBackButtonEnabled: true,
    });
  }, []);

  // Auto-set toAsset when fromAsset changes
  useEffect(() => {
    if (fromAsset === 'HIVE') setToAsset('HBD');
    else if (fromAsset === 'HBD') setToAsset('HIVE');
    else setToAsset('SWAP.HIVE');
    setEstimate(null);
    setFromAmount('');
  }, [fromAsset]);

  const getBalance = useCallback(() => {
    if (!activeAccount?.account) return '0';
    if (fromAsset === 'HIVE')
      return parseFloat(
        (activeAccount.account.balance as string).split(' ')[0],
      ).toFixed(3);
    if (fromAsset === 'HBD')
      return parseFloat(
        (activeAccount.account.hbd_balance as string).split(' ')[0],
      ).toFixed(3);
    const token = userTokens?.find((t: any) => t.symbol === fromAsset);
    return token ? parseFloat(token.balance).toFixed(3) : '0';
  }, [activeAccount, fromAsset, userTokens]);

  const fetchEstimate = useCallback(async () => {
    // Bump sequence on EVERY call so any in-flight request is invalidated
    const seq = ++estimateSeqRef.current;
    const amt = parseFloat(fromAmount);
    if (!amt || amt <= 0) {
      setEstimate(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    let est: SwapEstimate | null = null;
    if (HIVE_ASSETS.includes(fromAsset) && HIVE_ASSETS.includes(toAsset)) {
      est = await SwapUtils.estimateHiveSwap(fromAsset, amt);
    } else {
      est = await SwapUtils.estimateEngineSwap(fromAsset, toAsset, amt);
    }
    // Only apply if this is still the latest request
    if (seq === estimateSeqRef.current) {
      setEstimate(est);
      setLoading(false);
    }
  }, [fromAmount, fromAsset, toAsset]);

  useEffect(() => {
    const timer = setTimeout(fetchEstimate, 500);
    return () => clearTimeout(timer);
  }, [fromAmount, fromAsset, toAsset]);

  const executeSwap = async () => {
    if (!estimate || !activeAccount?.keys?.active) return;
    try {
      addToLoadingList('popup_html_swap');
      const amt = parseFloat(fromAmount);

      if (estimate.method === 'hive') {
        const op = SwapUtils.buildLimitOrderOperation(
          activeAccount.name!,
          fromAsset === 'HIVE',
          amt,
          estimate.toAmount,
        );
        await HiveTxUtils.sendOperation(
          [op],
          activeAccount.keys.active,
        );
      } else {
        const buying = fromAsset === 'SWAP.HIVE';
        const symbol = buying ? toAsset : fromAsset;
        const op = SwapUtils.buildEngineMarketOperation(
          activeAccount.name!,
          buying ? 'buy' : 'sell',
          symbol,
          buying ? estimate.toAmount : amt,
          estimate.engineOrderPrice!,
        );
        await HiveEngineUtils.sendOperation(
          [op],
          activeAccount.keys.active,
        );
      }

      setSuccessMessage('popup_html_swap_success');
      setStep('success');
      refreshActiveAccount();
    } catch (err: any) {
      setErrorMessage(err.message || 'Swap failed');
    } finally {
      removeFromLoadingList('popup_html_swap');
    }
  };

  const engineTokens = (userTokens || [])
    .filter((t: any) => parseFloat(t.balance) > 0)
    .map((t: any) => t.symbol);

  const availableFromAssets = ['HIVE', 'HBD', 'SWAP.HIVE', ...engineTokens]
    .filter((v, i, a) => a.indexOf(v) === i);

  const renderForm = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      {/* From */}
      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>From</div>
        <div style={{
          display: 'flex', gap: '8px', alignItems: 'center',
          background: 'var(--input-background)',
          border: '1px solid var(--input-border)',
          borderRadius: '12px', padding: '10px 12px',
        }}>
          <select
            value={fromAsset}
            onChange={(e) => setFromAsset(e.target.value)}
            style={{
              background: 'transparent', border: 'none', color: 'var(--main-font-color)',
              fontSize: '15px', fontWeight: 600, outline: 'none', width: '120px',
            }}>
            {availableFromAssets.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="0.000"
            value={fromAmount}
            onChange={(e) => setFromAmount(e.target.value)}
            style={{
              flex: 1, background: 'transparent', border: 'none',
              color: 'var(--main-font-color)', fontSize: '16px',
              textAlign: 'right', outline: 'none',
            }}
          />
        </div>
        <div
          style={{ fontSize: '11px', opacity: 0.5, marginTop: '4px', cursor: 'pointer', textAlign: 'right' }}
          onClick={() => setFromAmount(getBalance())}>
          Balance: {getBalance()} {fromAsset}
        </div>
      </div>

      {/* Arrow */}
      <div style={{ textAlign: 'center', fontSize: '20px' }}>&#8595;</div>

      {/* To */}
      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>To</div>
        <div style={{
          display: 'flex', gap: '8px', alignItems: 'center',
          background: 'var(--input-background)',
          border: '1px solid var(--input-border)',
          borderRadius: '12px', padding: '10px 12px',
        }}>
          <div style={{ fontSize: '15px', fontWeight: 600, width: '120px' }}>{toAsset}</div>
          <div style={{
            flex: 1, textAlign: 'right', fontSize: '16px',
            color: estimate ? 'var(--main-font-color)' : 'var(--placeholder-color)',
          }}>
            {loading ? '...' : estimate ? estimate.toAmount : '0.000'}
          </div>
        </div>
      </div>

      {/* Rate info */}
      {estimate && (
        <div style={{
          fontSize: '12px', opacity: 0.6, padding: '8px 12px',
          background: 'var(--card-background)', borderRadius: '8px',
          border: '1px solid var(--card-border)',
        }}>
          <div>Rate: 1 {fromAsset} ≈ {estimate.rate.toFixed(6)} {toAsset}</div>
          {estimate.slippage > 0.5 && (
            <div style={{ color: '#e8a317', marginTop: '4px' }}>
              Slippage: {estimate.slippage}%
            </div>
          )}
        </div>
      )}

      {/* Swap button */}
      <OperationButtonComponent
        dataTestId="swap-confirm-button"
        label="popup_html_swap"
        onClick={() => setStep('confirm')}
        requiredKey={KeychainKeyTypesLC.active}
        disabled={!estimate || !fromAmount || parseFloat(fromAmount) <= 0}
      />
    </div>
  );

  const renderConfirm = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      <div style={{ textAlign: 'center', fontSize: '16px', fontWeight: 600 }}>
        Confirm Swap
      </div>
      <div style={{
        padding: '16px', background: 'var(--card-background)',
        border: '1px solid var(--card-border)', borderRadius: '12px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span>You send</span>
          <span style={{ fontWeight: 600 }}>{fromAmount} {fromAsset}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span>You receive (est.)</span>
          <span style={{ fontWeight: 600 }}>{estimate?.toAmount} {toAsset}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', opacity: 0.6 }}>
          <span>Rate</span>
          <span>1 {fromAsset} ≈ {estimate?.rate.toFixed(6)} {toAsset}</span>
        </div>
        {estimate && estimate.slippage > 1 && (
          <div style={{ color: '#e8a317', fontSize: '12px', marginTop: '8px' }}>
            Warning: {estimate.slippage}% slippage
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <ButtonComponent
          label="popup_html_cancel"
          onClick={() => setStep('form')}
          type={ButtonType.ALTERNATIVE}
        />
        <OperationButtonComponent
          dataTestId="swap-execute-button"
          label="popup_html_swap"
          onClick={executeSwap}
          requiredKey={KeychainKeyTypesLC.active}
        />
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: '16px', padding: '32px 16px',
    }}>
      <div style={{ fontSize: '48px' }}>&#9989;</div>
      <div style={{ fontWeight: 600, fontSize: '18px' }}>Swap Submitted</div>
      <div style={{ fontSize: '13px', opacity: 0.6, textAlign: 'center' }}>
        {fromAmount} {fromAsset} → {estimate?.toAmount} {toAsset}
      </div>
      <ButtonComponent
        label="popup_html_swap_new"
        onClick={() => {
          setStep('form');
          setFromAmount('');
          setEstimate(null);
        }}
      />
    </div>
  );

  return (
    <div
      className="swap-page"
      data-testid={`${Screen.SWAP_PAGE}-page`}
      style={{ height: '100%' }}>
      {step === 'form' && renderForm()}
      {step === 'confirm' && renderConfirm()}
      {step === 'success' && renderSuccess()}
    </div>
  );
};

const mapStateToProps = (state: RootState) => ({
  activeAccount: state.hive.activeAccount,
  globalProperties: state.hive.globalProperties,
  userTokens: state.hive.userTokens?.list,
});

const connector = connect(mapStateToProps, {
  setTitleContainerProperties,
  setErrorMessage,
  setSuccessMessage,
  addToLoadingList,
  removeFromLoadingList,
  refreshActiveAccount,
});
type PropsFromRedux = ConnectedProps<typeof connector>;
export const SwapComponent = connector(Swap);
