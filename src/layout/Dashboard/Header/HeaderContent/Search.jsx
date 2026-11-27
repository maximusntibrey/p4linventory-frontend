import { useNavigate } from 'react-router-dom';

// material-ui
import Autocomplete from '@mui/material/Autocomplete';
import FormControl from '@mui/material/FormControl';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';

// project imports
import menuItem from 'menu-items';

// assets
import SearchOutlined from '@ant-design/icons/SearchOutlined';

// ==============================|| HEADER CONTENT - SEARCH ||============================== //
// Jump to any screen the server's menu offers (no invented data).

export default function Search() {
  const navigate = useNavigate();
  const options = menuItem.items.flatMap((group) => group.children.map((c) => ({ label: c.title, url: c.url, group: group.title })));

  return (
    <Box sx={{ width: '100%', ml: { xs: 0, md: 1 } }}>
      <FormControl sx={{ width: { xs: '100%', md: 224 } }}>
        <Autocomplete
          size="small"
          options={options}
          value={null}
          blurOnSelect
          clearOnBlur
          autoHighlight
          noOptionsText="No matching screen"
          onChange={(_, option) => option && navigate(option.url)}
          isOptionEqualToValue={(a, b) => a.url === b.url}
          renderInput={(params) => (
            <TextField
              {...params}
              id="header-search"
              placeholder="Search or jump to"
              slotProps={{
                ...params.slotProps,
                input: {
                  ...params.slotProps.input,
                  startAdornment: (
                    <InputAdornment position="start" sx={{ mr: -0.5 }}>
                      <SearchOutlined />
                    </InputAdornment>
                  )
                },
                htmlInput: { ...params.slotProps.htmlInput, 'aria-label': 'Search or jump to' }
              }}
            />
          )}
        />
      </FormControl>
    </Box>
  );
}
