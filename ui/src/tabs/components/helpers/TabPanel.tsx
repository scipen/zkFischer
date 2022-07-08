import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

export default function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
  
    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`vertical-tabpanel-${index}`}
        aria-labelledby={`vertical-tab-${index}`}
        {...other}
      >
        {value === index && (
          <Box sx={{ p: 3 }}>
            <Typography component={'div'}>{children}</Typography>
          </Box>
        )}
      </div>
    );
}

export function a11yProps(index: number) {
    return {
      id: `vertical-tab-${index}`,
      'aria-controls': `vertical-tabpanel-${index}`,
    };
}