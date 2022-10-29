import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { WalletSelectButton } from './WalletSelectButton/WalletSelectButton';
import { Navbar, Nav } from 'rsuite';
import HomeIcon from '@rsuite/icons/legacy/Home';
import AddIcon from '@rsuite/icons/AddOutline';
import MyIcon from '@rsuite/icons/legacy/Book';
import AboutIcon from '@rsuite/icons/legacy/Question';
import ContactIcon from '@rsuite/icons/legacy/AddressBook';
import TwitterIcon from '@rsuite/icons/legacy/Twitter';
import GithubIcon from '@rsuite/icons/legacy/Github';
import EmailIcon from '@rsuite/icons/Email';
import LinkIcon from '@rsuite/icons/legacy/Link';

export const Navigation = (props) => {
  return (<>
    <div>
      <Navbar appearance='subtle'>
        <Navbar.Brand href="#">
          ThetAR Exchange
        </Navbar.Brand>
        <Nav>
          <Nav.Menu title="Menu">
            <Nav.Item icon={<HomeIcon />}><Link to="/" className='menuText'>Home</Link></Nav.Item>
            <Nav.Item icon={<AddIcon />}><Link to="/addPair" className='menuText'>Add Pair</Link></Nav.Item>
            <Nav.Item icon={<MyIcon />}><Link to="/my" className='menuText'>My Orders</Link></Nav.Item>
            <Nav.Item icon={<AboutIcon />}><Link to="/about" className='menuText'>About</Link></Nav.Item>
            <Nav.Menu icon={<ContactIcon />} title="Contact" className='menuText'>
              <Nav.Item icon={<TwitterIcon />}><a href='https://twitter.com/mARsLab_2022' className='menuText'>Twitter</a></Nav.Item>
              <Nav.Item icon={<GithubIcon />}><a href='https://github.com/marslab2022' className='menuText'>Github</a></Nav.Item>
              <Nav.Item icon={<EmailIcon />}><a href='mailto: marslab.2022@gmail.com' className='menuText'>E-mail</a></Nav.Item>
            </Nav.Menu>
          </Nav.Menu>
        </Nav>
        <Nav pullRight>
          <WalletSelectButton setIsConnected={value => props.setIsWalletConnected(value)} />
        </Nav>
      </Navbar>
    </div>
  </>); 
}
