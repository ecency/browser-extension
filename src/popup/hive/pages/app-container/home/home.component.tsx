import { setSuccessMessage } from '@popup/multichain/actions/message.actions';
import { resetTitleContainerProperties } from '@popup/multichain/actions/title-container.actions';
import { RootState } from '@popup/multichain/store';
import { Screen } from '@reference-data/screen.enum';
import React, { useEffect, useState } from 'react';
import { ConnectedProps, connect } from 'react-redux';
import { LocalAccount } from 'src/interfaces/local-account.interface';
import { refreshActiveAccount } from 'src/popup/hive/actions/active-account.actions';
import { loadCurrencyPrices } from 'src/popup/hive/actions/currency-prices.actions';
import { ActionsSectionComponent } from 'src/popup/hive/pages/app-container/home/actions-section/actions-section.component';
import { EstimatedAccountValueSectionComponent } from 'src/popup/hive/pages/app-container/home/estimated-account-value-section/estimated-account-value-section.component';
import { GovernanceRenewalComponent } from 'src/popup/hive/pages/app-container/home/governance-renewal/governance-renewal.component';
import { ResourcesSectionComponent } from 'src/popup/hive/pages/app-container/home/resources-section/resources-section.component';
import { TopBarComponent } from 'src/popup/hive/pages/app-container/home/top-bar/top-bar.component';
import { ProposalVotingSectionComponent } from 'src/popup/hive/pages/app-container/home/voting-section/proposal-voting-section/proposal-voting-section.component';
import { WalletInfoSectionComponent } from 'src/popup/hive/pages/app-container/home/wallet-info-section/wallet-info-section.component';
import ActiveAccountUtils from 'src/popup/hive/utils/active-account.utils';
import { GovernanceUtils } from 'src/popup/hive/utils/governance.utils';

const Home = ({
  activeAccount,
  accounts,
  activeRpc,
  refreshActiveAccount,
  resetTitleContainerProperties,
}: PropsFromRedux) => {
  const [governanceAccountsToExpire, setGovernanceAccountsToExpire] = useState<
    string[]
  >([]);
  const [scrollTop, setScrollTop] = useState(0);
  const [showBottomBar, setShowBottomBar] = useState(true);

  useEffect(() => {
    resetTitleContainerProperties();
    if (!ActiveAccountUtils.isEmpty(activeAccount)) {
      refreshActiveAccount();
    }
  }, []);

  useEffect(() => {
    if (activeRpc && activeRpc.uri !== 'NULL')
      initGovernanceExpirationReminder(
        accounts
          .filter((localAccount: LocalAccount) => localAccount.keys.active)
          .map((localAccount: LocalAccount) => localAccount.name),
      );
  }, [activeRpc]);

  const initGovernanceExpirationReminder = async (accountNames: string[]) => {
    const accountsToRemind = await GovernanceUtils.getGovernanceReminderList(
      accountNames,
    );
    setGovernanceAccountsToExpire(accountsToRemind);
  };

  const renderPopup = (governanceAccountsToExpire: string[]) => {
    if (governanceAccountsToExpire.length > 0) {
      return (
        <GovernanceRenewalComponent accountNames={governanceAccountsToExpire} />
      );
    }
    return <ProposalVotingSectionComponent />;
  };

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const scrolled = event.currentTarget.scrollTop;
    if (scrolled > scrollTop) {
      setShowBottomBar(false);
    } else {
      setShowBottomBar(true);
    }
    setScrollTop(scrolled);

    if (
      event.currentTarget.clientHeight + event.currentTarget.scrollTop + 1 >
      event.currentTarget.scrollHeight
    ) {
      setShowBottomBar(true);
    }
  };

  return (
    <div className={'home-page'} data-testid={`${Screen.HOME_PAGE}-page`}>
      {activeAccount &&
        activeAccount.name &&
        activeRpc &&
        activeRpc.uri !== 'NULL' && (
          <>
            <TopBarComponent />
            <div className={'home-page-content'} onScroll={handleScroll}>
              <ResourcesSectionComponent />
              <EstimatedAccountValueSectionComponent />
              <WalletInfoSectionComponent />
            </div>
            <ActionsSectionComponent
              additionalClass={showBottomBar ? undefined : 'down'}
            />
          </>
        )}

      {renderPopup(governanceAccountsToExpire)}
    </div>
  );
};

const mapStateToProps = (state: RootState) => {
  return {
    activeAccount: state.hive.activeAccount,
    accounts: state.hive.accounts,
    activeRpc: state.hive.activeRpc,
    globalProperties: state.hive.globalProperties,
    isAppReady:
      Object.keys(state.hive.globalProperties).length > 0 &&
      !ActiveAccountUtils.isEmpty(state.hive.activeAccount),
  };
};

const connector = connect(mapStateToProps, {
  loadCurrencyPrices,
  refreshActiveAccount,
  resetTitleContainerProperties,
  setSuccessMessage,
});
type PropsFromRedux = ConnectedProps<typeof connector>;

export const HomeComponent = connector(Home);
